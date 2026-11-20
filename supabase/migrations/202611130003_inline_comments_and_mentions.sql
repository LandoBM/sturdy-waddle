begin;

alter table public.post_comments
  add column if not exists parent_comment_id uuid references public.post_comments (id) on delete cascade;

create index if not exists post_comments_parent_comment_id_idx
  on public.post_comments (parent_comment_id, created_at asc);

create table if not exists public.comment_tags (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.post_comments (id) on delete cascade,
  tagged_profile_id uuid references public.profiles (id) on delete cascade,
  tagged_club_id uuid references public.clubs (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint comment_tags_exactly_one_target check (
    (tagged_profile_id is not null)::integer + (tagged_club_id is not null)::integer = 1
  )
);

create unique index if not exists comment_tags_profile_unique
  on public.comment_tags (comment_id, tagged_profile_id)
  where tagged_profile_id is not null;

create unique index if not exists comment_tags_club_unique
  on public.comment_tags (comment_id, tagged_club_id)
  where tagged_club_id is not null;

create index if not exists comment_tags_comment_id_idx on public.comment_tags (comment_id, created_at);

alter table public.comment_tags enable row level security;

drop policy if exists "Users can read permitted comment tags" on public.comment_tags;
create policy "Users can read permitted comment tags"
on public.comment_tags for select to authenticated
using (exists (
  select 1
  from public.post_comments
  join public.community_posts on community_posts.id = post_comments.post_id
  where post_comments.id = comment_tags.comment_id
    and (
      community_posts.visibility = 'public'
      or community_posts.author_id = (select auth.uid())
      or (community_posts.club_id is not null and public.can_read_club(community_posts.club_id))
    )
));

drop policy if exists "Comment authors can create their own tags" on public.comment_tags;
create policy "Comment authors can create their own tags"
on public.comment_tags for insert to authenticated
with check (
  exists (
    select 1 from public.post_comments
    where post_comments.id = comment_tags.comment_id
      and post_comments.author_id = (select auth.uid())
  )
  and (
    (tagged_profile_id is not null and exists (select 1 from public.profiles where profiles.id = comment_tags.tagged_profile_id))
    or (tagged_club_id is not null and exists (select 1 from public.clubs where clubs.id = comment_tags.tagged_club_id and public.can_read_club(clubs.id)))
  )
);

drop policy if exists "Comment authors can remove their own tags" on public.comment_tags;
create policy "Comment authors can remove their own tags"
on public.comment_tags for delete to authenticated
using (exists (
  select 1 from public.post_comments
  where post_comments.id = comment_tags.comment_id
    and post_comments.author_id = (select auth.uid())
));

grant select, insert, delete on public.comment_tags to authenticated;

commit;
