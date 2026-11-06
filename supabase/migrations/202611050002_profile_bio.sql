alter table public.profiles
  add column if not exists bio text not null default '';

alter table public.profiles
  drop constraint if exists profiles_bio_length;

alter table public.profiles
  add constraint profiles_bio_length check (length(bio) <= 280);

insert into public.profiles (id, display_name)
select id, coalesce(raw_user_meta_data ->> 'display_name', '')
from auth.users
on conflict (id) do nothing;

drop policy if exists "Users update their own profile" on public.profiles;
create policy "Users update their own profile"
on public.profiles for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

grant update (display_name, bio) on public.profiles to authenticated;
