create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  owner_status text not null default 'none' check (owner_status in ('none', 'pending', 'verified')),
  created_at timestamptz not null default now()
);

create table if not exists public.owner_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  organization_name text not null,
  contact_email text not null,
  terms_version text not null,
  terms_accepted_at timestamptz not null,
  owner_documents_version text not null,
  owner_documents_accepted_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'verified')),
  created_at timestamptz not null default now()
);

create table if not exists public.clubs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete restrict,
  name text not null check (length(trim(name)) between 2 and 80),
  description text not null default '' check (length(description) <= 2000),
  activity text not null default '',
  location text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.club_memberships (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs (id) on delete cascade,
  member_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'active', 'rejected')),
  created_at timestamptz not null default now(),
  unique (club_id, member_id)
);

create table if not exists public.club_updates (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs (id) on delete cascade,
  author_id uuid not null references auth.users (id) on delete restrict,
  body text not null check (length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create or replace function public.is_verified_club_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and owner_status = 'verified'
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  metadata jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  owner_signup boolean := metadata ->> 'account_type' = 'club_owner';
  owner_consent_provided boolean :=
    nullif(trim(metadata ->> 'organization_name'), '') is not null
    and nullif(metadata ->> 'terms_version', '') is not null
    and nullif(metadata ->> 'terms_accepted_at', '') is not null
    and nullif(metadata ->> 'owner_documents_version', '') is not null
    and nullif(metadata ->> 'owner_documents_accepted_at', '') is not null;
begin
  insert into public.profiles (id, display_name, owner_status)
  values (
    new.id,
    coalesce(metadata ->> 'display_name', ''),
    case when owner_signup and owner_consent_provided then 'pending' else 'none' end
  )
  on conflict (id) do nothing;

  if owner_signup and owner_consent_provided then
    insert into public.owner_applications (
      user_id, organization_name, contact_email, terms_version, terms_accepted_at,
      owner_documents_version, owner_documents_accepted_at
    )
    values (
      new.id,
      coalesce(nullif(trim(metadata ->> 'organization_name'), ''), 'Club'),
      new.email,
      coalesce(metadata ->> 'terms_version', 'draft'),
      coalesce((metadata ->> 'terms_accepted_at')::timestamptz, now()),
      coalesce(metadata ->> 'owner_documents_version', 'draft'),
      coalesce((metadata ->> 'owner_documents_accepted_at')::timestamptz, now())
    )
    on conflict (user_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

insert into public.profiles (id, display_name)
select id, coalesce(raw_user_meta_data ->> 'display_name', '')
from auth.users
on conflict (id) do nothing;

create or replace function public.verify_pending_club_owner_email()
returns text
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  confirmed_at timestamptz;
  application_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Sign in is required.';
  end if;

  select email_confirmed_at into confirmed_at
  from auth.users where id = auth.uid();
  if confirmed_at is null then
    return 'email_unverified';
  end if;

  select id into application_id
  from public.owner_applications
  where user_id = auth.uid() and status = 'pending';
  if application_id is null then
    return 'no_pending_application';
  end if;

  update public.owner_applications set status = 'verified' where id = application_id;
  update public.profiles set owner_status = 'verified' where id = auth.uid();
  return 'verified';
end;
$$;

create or replace function public.request_club_owner_access(
  p_organization_name text,
  p_terms_version text,
  p_terms_accepted_at timestamptz,
  p_owner_documents_version text,
  p_owner_documents_accepted_at timestamptz
)
returns text
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  current_email text;
  confirmed_at timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Sign in is required.';
  end if;
  if length(trim(coalesce(p_organization_name, ''))) < 2
    or p_terms_version is null or p_owner_documents_version is null
    or p_terms_accepted_at is null or p_owner_documents_accepted_at is null then
    raise exception 'Complete the owner agreement fields before continuing.';
  end if;

  select email, email_confirmed_at into current_email, confirmed_at
  from auth.users where id = auth.uid();
  if confirmed_at is null then
    raise exception 'Verify your email address before requesting club-owner access.';
  end if;

  insert into public.owner_applications (
    user_id, organization_name, contact_email, terms_version, terms_accepted_at,
    owner_documents_version, owner_documents_accepted_at, status
  )
  values (
    auth.uid(), trim(p_organization_name), current_email, p_terms_version, p_terms_accepted_at,
    p_owner_documents_version, p_owner_documents_accepted_at, 'verified'
  )
  on conflict (user_id) do update set
    organization_name = excluded.organization_name,
    contact_email = excluded.contact_email,
    terms_version = excluded.terms_version,
    terms_accepted_at = excluded.terms_accepted_at,
    owner_documents_version = excluded.owner_documents_version,
    owner_documents_accepted_at = excluded.owner_documents_accepted_at,
    status = 'verified';

  update public.profiles set owner_status = 'verified' where id = auth.uid();
  return 'verified';
end;
$$;

alter table public.profiles enable row level security;
alter table public.owner_applications enable row level security;
alter table public.clubs enable row level security;
alter table public.club_memberships enable row level security;
alter table public.club_updates enable row level security;

create policy "Profiles are visible to their account"
on public.profiles for select to authenticated using (
  id = (select auth.uid()) or exists (
    select 1
    from public.club_memberships
    join public.clubs on clubs.id = club_memberships.club_id
    where club_memberships.member_id = profiles.id
      and clubs.owner_id = (select auth.uid())
  )
);

create policy "Owners can read their application"
on public.owner_applications for select to authenticated using (user_id = (select auth.uid()));

create policy "Clubs are public"
on public.clubs for select to anon, authenticated using (true);

create policy "Verified owners create clubs"
on public.clubs for insert to authenticated
with check (owner_id = (select auth.uid()) and public.is_verified_club_owner());

create policy "Verified owners update their clubs"
on public.clubs for update to authenticated
using (owner_id = (select auth.uid()) and public.is_verified_club_owner())
with check (owner_id = (select auth.uid()) and public.is_verified_club_owner());

create policy "Verified owners delete their clubs"
on public.clubs for delete to authenticated
using (owner_id = (select auth.uid()) and public.is_verified_club_owner());

create policy "Members read their requests and owners read club requests"
on public.club_memberships for select to authenticated
using (
  member_id = (select auth.uid()) or exists (
    select 1 from public.clubs
    where clubs.id = club_memberships.club_id and clubs.owner_id = (select auth.uid())
  )
);

create policy "Members request to join clubs"
on public.club_memberships for insert to authenticated
with check (member_id = (select auth.uid()) and status = 'pending');

create policy "Verified owners decide membership requests"
on public.club_memberships for update to authenticated
using (
  public.is_verified_club_owner() and exists (
    select 1 from public.clubs
    where clubs.id = club_memberships.club_id and clubs.owner_id = (select auth.uid())
  )
)
with check (
  public.is_verified_club_owner() and status in ('active', 'rejected') and exists (
    select 1 from public.clubs
    where clubs.id = club_memberships.club_id and clubs.owner_id = (select auth.uid())
  )
);

create policy "Club updates are public"
on public.club_updates for select to anon, authenticated using (true);

create policy "Verified owners publish updates"
on public.club_updates for insert to authenticated
with check (
  author_id = (select auth.uid()) and public.is_verified_club_owner() and exists (
    select 1 from public.clubs
    where clubs.id = club_updates.club_id and clubs.owner_id = (select auth.uid())
  )
);

create policy "Verified owners edit updates"
on public.club_updates for update to authenticated
using (
  author_id = (select auth.uid()) and public.is_verified_club_owner() and exists (
    select 1 from public.clubs
    where clubs.id = club_updates.club_id and clubs.owner_id = (select auth.uid())
  )
)
with check (
  author_id = (select auth.uid()) and public.is_verified_club_owner() and exists (
    select 1 from public.clubs
    where clubs.id = club_updates.club_id and clubs.owner_id = (select auth.uid())
  )
);

grant usage on schema public to anon, authenticated;
grant select on public.clubs, public.club_updates to anon, authenticated;
grant select on public.profiles, public.owner_applications to authenticated;
grant insert, delete on public.clubs to authenticated;
grant update (name, description, activity, location, updated_at) on public.clubs to authenticated;
grant select, insert on public.club_memberships to authenticated;
grant update (status) on public.club_memberships to authenticated;
grant insert on public.club_updates to authenticated;
grant update (body) on public.club_updates to authenticated;
revoke insert, update, delete on public.owner_applications from authenticated;

grant execute on function public.verify_pending_club_owner_email() to authenticated;
grant execute on function public.request_club_owner_access(text, text, timestamptz, text, timestamptz) to authenticated;
