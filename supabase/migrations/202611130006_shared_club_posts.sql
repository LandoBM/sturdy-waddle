-- Attach a structured club preview to a normal community post without
-- changing club_id, which continues to mean "posted as this club".
alter table public.community_posts
  add column if not exists shared_club_id uuid references public.clubs (id) on delete set null;

create index if not exists community_posts_shared_club_created_at_idx
  on public.community_posts (shared_club_id, created_at desc)
  where shared_club_id is not null;

drop policy if exists "Users create permitted community posts" on public.community_posts;
create policy "Users create permitted community posts"
on public.community_posts for insert to authenticated
with check (
  author_id = (select auth.uid())
  and (club_id is null or public.can_post_to_club(club_id))
  and (shared_club_id is null or public.can_read_club(shared_club_id))
);

drop policy if exists "Users edit permitted community posts" on public.community_posts;
create policy "Users edit permitted community posts"
on public.community_posts for update to authenticated
using (
  author_id = (select auth.uid())
  and (club_id is null or public.can_post_to_club(club_id))
  and (shared_club_id is null or public.can_read_club(shared_club_id))
)
with check (
  author_id = (select auth.uid())
  and (club_id is null or public.can_post_to_club(club_id))
  and (shared_club_id is null or public.can_read_club(shared_club_id))
);

drop policy if exists "Users read permitted community posts" on public.community_posts;
create policy "Users read permitted community posts"
on public.community_posts for select to authenticated
using (
  (
    club_id is null
    and (shared_club_id is null or public.can_read_club(shared_club_id))
    and (visibility = 'public' or author_id = (select auth.uid()))
  )
  or (
    club_id is not null
    and public.can_read_club(club_id)
    and (shared_club_id is null or public.can_read_club(shared_club_id))
    and (visibility = 'public' or author_id = (select auth.uid()) or public.is_club_manager(club_id))
  )
);

grant update (shared_club_id) on public.community_posts to authenticated;
