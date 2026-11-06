-- Repair profile editing permissions and refresh PostgREST after migrations 001-004.
do $$
begin
  if to_regclass('public.profiles') is null then
    raise exception 'public.profiles is missing. Run migrations 202611050001 through 202611050004 first.';
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

-- Tell PostgREST to refresh its table and column schema cache immediately.
notify pgrst, 'reload schema';
