-- FitHive social interactions and club-request notifications.
-- Apply after the Phase 6, Phase 7B, and club-media policy migrations.

begin;

alter table public.notifications
  add column if not exists club_id uuid references public.clubs (id) on delete cascade,
  add column if not exists membership_id uuid references public.club_memberships (id) on delete cascade;

alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check
  check (type in ('follow', 'new_post', 'comment', 'like', 'club_join_request'));

create index if not exists notifications_club_id_idx
  on public.notifications (club_id, created_at desc)
  where club_id is not null;

create index if not exists notifications_membership_id_idx
  on public.notifications (membership_id)
  where membership_id is not null;

-- Keep post engagement visible only when the viewer can read the post.
drop policy if exists "Authenticated users can read likes" on public.post_likes;
create policy "Authenticated users can read permitted likes"
on public.post_likes for select to authenticated
using (exists (
  select 1
  from public.community_posts
  where community_posts.id = post_likes.post_id
    and (
      community_posts.visibility = 'public'
      or community_posts.author_id = (select auth.uid())
      or (community_posts.club_id is not null and public.can_read_club(community_posts.club_id))
    )
));

drop policy if exists "Authenticated users can read public comments" on public.post_comments;
create policy "Authenticated users can read permitted comments"
on public.post_comments for select to authenticated
using (exists (
  select 1
  from public.community_posts
  where community_posts.id = post_comments.post_id
    and (
      community_posts.visibility = 'public'
      or community_posts.author_id = (select auth.uid())
      or (community_posts.club_id is not null and public.can_read_club(community_posts.club_id))
    )
));

drop policy if exists "Users can create their own comments" on public.post_comments;
create policy "Users can create permitted comments"
on public.post_comments for insert to authenticated
with check (
  author_id = (select auth.uid())
  and exists (
    select 1
    from public.community_posts
    where community_posts.id = post_comments.post_id
      and (
        community_posts.visibility = 'public'
        or community_posts.author_id = (select auth.uid())
        or (community_posts.club_id is not null and public.can_read_club(community_posts.club_id))
      )
  )
);

create or replace function public.create_post_interaction_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  post_author uuid;
  actor_name text;
begin
  if tg_table_name = 'post_comments' then
    select author_id into post_author
    from public.community_posts where id = new.post_id;
    if post_author is null or post_author = new.author_id then return new; end if;
    select coalesce(nullif(display_name, ''), username, 'Someone') into actor_name
    from public.profiles where id = new.author_id;
    insert into public.notifications (recipient_id, actor_id, post_id, type, title, body)
    values (post_author, new.author_id, new.post_id, 'comment', 'New comment on your post', coalesce(actor_name, 'Someone') || ' commented on your post.');
  else
    select author_id into post_author
    from public.community_posts where id = new.post_id;
    if post_author is null or post_author = new.user_id then return new; end if;
    select coalesce(nullif(display_name, ''), username, 'Someone') into actor_name
    from public.profiles where id = new.user_id;
    insert into public.notifications (recipient_id, actor_id, post_id, type, title, body)
    values (post_author, new.user_id, new.post_id, 'like', 'Your post was liked', coalesce(actor_name, 'Someone') || ' liked your post.');
  end if;
  return new;
end;
$$;

drop trigger if exists post_like_created_notification on public.post_likes;
create trigger post_like_created_notification
after insert on public.post_likes
for each row execute procedure public.create_post_interaction_notification();

drop trigger if exists post_comment_created_notification on public.post_comments;
create trigger post_comment_created_notification
after insert on public.post_comments
for each row execute procedure public.create_post_interaction_notification();

create or replace function public.create_club_join_request_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  club_owner uuid;
  club_name text;
  requester_name text;
begin
  if new.status <> 'pending' then return new; end if;

  select owner_id, name into club_owner, club_name
  from public.clubs where id = new.club_id;
  if club_owner is null or club_owner = new.member_id then return new; end if;

  select coalesce(nullif(display_name, ''), username, 'A FitHive member') into requester_name
  from public.profiles where id = new.member_id;

  insert into public.notifications (recipient_id, actor_id, club_id, membership_id, type, title, body)
  values (
    club_owner,
    new.member_id,
    new.club_id,
    new.id,
    'club_join_request',
    'New club join request',
    coalesce(requester_name, 'A FitHive member') || ' wants to join ' || coalesce(club_name, 'your club') || '.'
  );
  return new;
end;
$$;

drop trigger if exists club_membership_request_notification on public.club_memberships;
create trigger club_membership_request_notification
after insert on public.club_memberships
for each row execute procedure public.create_club_join_request_notification();

notify pgrst, 'reload schema';
commit;
