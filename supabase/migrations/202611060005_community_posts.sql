create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users (id) on delete cascade,
  body text not null check (length(trim(body)) between 1 and 280),
  image_url text,
  location text,
  club text,
  created_at timestamptz not null default now()
);

create index if not exists community_posts_created_at_idx
  on public.community_posts (created_at desc);

alter table public.community_posts enable row level security;

drop policy if exists "Authenticated users can read community posts" on public.community_posts;
create policy "Authenticated users can read community posts"
on public.community_posts for select to authenticated
using (true);

drop policy if exists "Users can create their own community posts" on public.community_posts;
create policy "Users can create their own community posts"
on public.community_posts for insert to authenticated
with check (author_id = (select auth.uid()));

drop policy if exists "Users can edit their own community posts" on public.community_posts;
create policy "Users can edit their own community posts"
on public.community_posts for update to authenticated
using (author_id = (select auth.uid()))
with check (author_id = (select auth.uid()));

drop policy if exists "Users can delete their own community posts" on public.community_posts;
create policy "Users can delete their own community posts"
on public.community_posts for delete to authenticated
using (author_id = (select auth.uid()));

grant select, insert, update, delete on public.community_posts to authenticated;

notify pgrst, 'reload schema';
