create table if not exists public.user_follows (
  follower_id uuid not null references auth.users (id) on delete cascade,
  following_username text not null check (following_username ~ '^[a-z0-9_]{3,20}$'),
  created_at timestamptz not null default now(),
  primary key (follower_id, following_username)
);

create index if not exists user_follows_following_username_idx
  on public.user_follows (following_username);

alter table public.user_follows enable row level security;

drop policy if exists "Authenticated users can read follows" on public.user_follows;
create policy "Authenticated users can read follows"
on public.user_follows for select to authenticated
using (true);

drop policy if exists "Users can follow accounts" on public.user_follows;
create policy "Users can follow accounts"
on public.user_follows for insert to authenticated
with check (follower_id = (select auth.uid()));

drop policy if exists "Users can unfollow accounts" on public.user_follows;
create policy "Users can unfollow accounts"
on public.user_follows for delete to authenticated
using (follower_id = (select auth.uid()));

grant select, insert, delete on public.user_follows to authenticated;

notify pgrst, 'reload schema';
