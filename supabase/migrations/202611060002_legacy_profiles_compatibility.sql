-- Compatibility repair for projects that already had a legacy profiles table.
-- The app uses display_name and owner_status, while the legacy table used name and status.

alter table public.profiles
  add column if not exists display_name text;

alter table public.profiles
  add column if not exists owner_status text;

alter table public.profiles
  add column if not exists avatar_url text;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'name'
  ) then
    execute $sql$
      update public.profiles
      set display_name = coalesce(nullif(trim(display_name), ''), nullif(trim(name), ''), '')
      where display_name is null or trim(display_name) = ''
    $sql$;
  else
    update public.profiles
    set display_name = coalesce(display_name, '')
    where display_name is null;
  end if;
end;
$$;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'status'
  ) then
    execute $sql$
      update public.profiles
      set owner_status = case lower(coalesce(status::text, ''))
        when 'verified' then 'verified'
        when 'pending' then 'pending'
        else 'none'
      end
      where owner_status is null
    $sql$;
  else
    update public.profiles
    set owner_status = coalesce(owner_status, 'none')
    where owner_status is null;
  end if;
end;
$$;

alter table public.profiles
  alter column display_name set default '';

alter table public.profiles
  alter column display_name set not null;

alter table public.profiles
  alter column owner_status set default 'none';

alter table public.profiles
  alter column owner_status set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_owner_status'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_owner_status
      check (owner_status in ('none', 'pending', 'verified'));
  end if;
end;
$$;

alter table public.profiles enable row level security;

drop policy if exists "Users update their own profile" on public.profiles;
create policy "Users update their own profile"
on public.profiles for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

grant usage on schema public to authenticated;
grant select on public.profiles to authenticated;
grant update (display_name, username, bio, avatar_url) on public.profiles to authenticated;

notify pgrst, 'reload schema';
