alter table public.profiles
  add column if not exists username text;

update public.profiles as profile
set username = left(
  coalesce(
    nullif(left(lower(regexp_replace(coalesce(
      auth_user.raw_user_meta_data ->> 'username',
      profile.display_name,
      split_part(auth_user.email, '@', 1),
      'member'
    ), '[^a-zA-Z0-9_]', '', 'g')), 7), ''),
    'member'
  ) || '_' || left(replace(profile.id::text, '-', ''), 12),
  20
)
from auth.users as auth_user
where auth_user.id = profile.id
  and profile.username is null;

alter table public.profiles
  alter column username set not null;

alter table public.profiles
  drop constraint if exists profiles_username_format;

alter table public.profiles
  add constraint profiles_username_format
  check (username ~ '^[a-z0-9_]{3,20}$');

create unique index if not exists profiles_username_unique
  on public.profiles (username);

create or replace function public.is_username_available(candidate text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select candidate ~ '^[a-zA-Z0-9_]{3,20}$'
    and not exists (
      select 1
      from public.profiles
      where username = lower(regexp_replace(trim(candidate), '^@', ''))
    );
$$;

revoke all on function public.is_username_available(text) from public;
grant execute on function public.is_username_available(text) to anon, authenticated;

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
  requested_username text := lower(regexp_replace(
    coalesce(nullif(trim(metadata ->> 'username'), ''), 'member_' || left(replace(new.id::text, '-', ''), 12)),
    '^@',
    ''
  ));
begin
  insert into public.profiles (id, display_name, username, owner_status)
  values (
    new.id,
    coalesce(metadata ->> 'display_name', ''),
    requested_username,
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

grant update (username, display_name, bio) on public.profiles to authenticated;
