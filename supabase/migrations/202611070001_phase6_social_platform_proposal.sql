-- FitHive Phase 6 review draft.
-- This migration is intentionally not applied by the coding agent.
-- It extends the existing profiles, clubs, memberships, follows, and
-- community_posts schema created by migrations 202611050001-202611060006.

begin;

alter table public.profiles
  add column if not exists updated_at timestamptz not null default now();

alter table public.clubs
  add column if not exists image_url text,
  add column if not exists visibility text not null default 'public';

alter table public.club_memberships
  add column if not exists role text not null default 'member',
  add column if not exists joined_at timestamptz;

update public.club_memberships
set joined_at = coalesce(joined_at, created_at)
where joined_at is null;

alter table public.community_posts
  add column if not exists visibility text not null default 'public',
  add column if not exists updated_at timestamptz not null default now();

-- Keep the existing username-based follow column for compatibility while
-- adding a stable auth.users relationship for cross-account queries.
alter table public.user_follows
  add column if not exists following_id uuid references auth.users (id) on delete cascade;

update public.user_follows follows
set following_id = profiles.id
from public.profiles
where follows.following_id is null
  and profiles.username = follows.following_username;

create unique index if not exists user_follows_follower_following_id_unique
  on public.user_follows (follower_id, following_id)
  where following_id is not null;

create index if not exists user_follows_following_id_idx
  on public.user_follows (following_id);

create table if not exists public.post_likes (
  post_id uuid not null references public.community_posts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index if not exists post_likes_user_id_idx
  on public.post_likes (user_id);

create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts (id) on delete cascade,
  author_id uuid not null references auth.users (id) on delete cascade,
  body text not null check (length(trim(body)) between 1 and 280),
  created_at timestamptz not null default now()
);

create index if not exists post_comments_post_created_at_idx
  on public.post_comments (post_id, created_at asc);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('post-media', 'post-media', true, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public post media is readable" on storage.objects;
create policy "Public post media is readable"
on storage.objects for select to anon, authenticated
using (bucket_id = 'post-media');

drop policy if exists "Users upload their own post media" on storage.objects;
create policy "Users upload their own post media"
on storage.objects for insert to authenticated
with check (bucket_id = 'post-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Users update their own post media" on storage.objects;
create policy "Users update their own post media"
on storage.objects for update to authenticated
using (bucket_id = 'post-media' and (storage.foldername(name))[1] = (select auth.uid())::text)
with check (bucket_id = 'post-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Users delete their own post media" on storage.objects;
create policy "Users delete their own post media"
on storage.objects for delete to authenticated
using (bucket_id = 'post-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'clubs_visibility') then
    alter table public.clubs add constraint clubs_visibility check (visibility in ('public', 'private'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'community_posts_visibility') then
    alter table public.community_posts add constraint community_posts_visibility check (visibility in ('public', 'followers', 'private'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'club_memberships_role') then
    alter table public.club_memberships add constraint club_memberships_role check (role in ('member', 'moderator', 'owner'));
  end if;
end;
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute procedure public.set_updated_at();

drop trigger if exists clubs_set_updated_at on public.clubs;
create trigger clubs_set_updated_at
before update on public.clubs
for each row execute procedure public.set_updated_at();

drop trigger if exists community_posts_set_updated_at on public.community_posts;
create trigger community_posts_set_updated_at
before update on public.community_posts
for each row execute procedure public.set_updated_at();

alter table public.post_likes enable row level security;
alter table public.post_comments enable row level security;

drop policy if exists "Authenticated users can read public profiles" on public.profiles;
create policy "Authenticated users can read public profiles"
on public.profiles for select to authenticated using (true);

drop policy if exists "Authenticated users can read public posts" on public.community_posts;
drop policy if exists "Authenticated users can read community posts" on public.community_posts;
create policy "Authenticated users can read public posts"
on public.community_posts for select to authenticated
using (visibility = 'public' or author_id = (select auth.uid()));

drop policy if exists "Authenticated users can read likes" on public.post_likes;
create policy "Authenticated users can read likes"
on public.post_likes for select to authenticated using (true);

drop policy if exists "Users can like posts as themselves" on public.post_likes;
create policy "Users can like posts as themselves"
on public.post_likes for insert to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists "Users can remove their own likes" on public.post_likes;
create policy "Users can remove their own likes"
on public.post_likes for delete to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "Authenticated users can read public comments" on public.post_comments;
create policy "Authenticated users can read public comments"
on public.post_comments for select to authenticated
using (exists (
  select 1 from public.community_posts
  where community_posts.id = post_comments.post_id
    and (community_posts.visibility = 'public' or community_posts.author_id = (select auth.uid()))
));

drop policy if exists "Users can create their own comments" on public.post_comments;
create policy "Users can create their own comments"
on public.post_comments for insert to authenticated
with check (author_id = (select auth.uid()));

drop policy if exists "Users can delete their own comments" on public.post_comments;
create policy "Users can delete their own comments"
on public.post_comments for delete to authenticated
using (author_id = (select auth.uid()));

drop policy if exists "Authenticated users can read public clubs" on public.clubs;
drop policy if exists "Clubs are public" on public.clubs;
create policy "Authenticated users can read public clubs"
on public.clubs for select to authenticated using (visibility = 'public' or owner_id = (select auth.uid()));

drop policy if exists "Members can read public club memberships" on public.club_memberships;
create policy "Members can read public club memberships"
on public.club_memberships for select to authenticated
using (
  member_id = (select auth.uid())
  or exists (select 1 from public.clubs where clubs.id = club_memberships.club_id and clubs.owner_id = (select auth.uid()))
  or exists (select 1 from public.clubs where clubs.id = club_memberships.club_id and clubs.visibility = 'public' and club_memberships.status = 'active')
);

drop policy if exists "Members can leave clubs" on public.club_memberships;
create policy "Members can leave clubs"
on public.club_memberships for delete to authenticated
using (member_id = (select auth.uid()));

drop policy if exists "Users can manage their own follows" on public.user_follows;
drop policy if exists "Users can follow accounts" on public.user_follows;
drop policy if exists "Users can unfollow accounts" on public.user_follows;
create policy "Users can manage their own follows"
on public.user_follows for insert to authenticated
with check (follower_id = (select auth.uid()) and follower_id <> following_id);

create policy "Users can delete their own follows"
on public.user_follows for delete to authenticated
using (follower_id = (select auth.uid()));

grant select on public.profiles, public.clubs, public.club_memberships, public.community_posts, public.post_likes, public.post_comments, public.user_follows to authenticated;
grant insert, delete on public.post_likes to authenticated;
grant insert, delete on public.post_comments to authenticated;
grant update (visibility, body, image_url, location, club, updated_at) on public.community_posts to authenticated;

notify pgrst, 'reload schema';
commit;
