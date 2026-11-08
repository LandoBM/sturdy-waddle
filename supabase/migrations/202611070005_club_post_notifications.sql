-- FitHive Phase 7E Step B: notify active club members about owner posts.
-- Review and apply manually after 202611070004_social_interactions_and_club_requests.sql.

begin;

-- Extend the existing notification type set without creating another table.
alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check
  check (type in ('follow', 'new_post', 'comment', 'like', 'club_join_request', 'club_post'));

create index if not exists notifications_club_post_idx
  on public.notifications (club_id, post_id, created_at desc)
  where type = 'club_post';

create unique index if not exists notifications_club_post_recipient_unique
  on public.notifications (recipient_id, post_id)
  where type = 'club_post' and post_id is not null;

-- The existing generic follower trigger would otherwise create a second
-- notification for a club owner post. Keep it for personal and member-tagged
-- posts, but let the dedicated club trigger notify active club members.
create or replace function public.create_post_notifications()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  author_name text;
begin
  if new.club_id is not null and exists (
    select 1 from public.clubs
    where clubs.id = new.club_id and clubs.owner_id = new.author_id
  ) then
    return new;
  end if;

  select coalesce(nullif(display_name, ''), username, 'Someone')
    into author_name
  from public.profiles
  where id = new.author_id;

  insert into public.notifications (recipient_id, actor_id, post_id, type, title, body)
  select follower_id, new.author_id, new.id, 'new_post', 'New post from ' || coalesce(author_name, 'Someone'), left(new.body, 120)
  from public.user_follows
  join public.profiles on public.profiles.username = user_follows.following_username
  where public.profiles.id = new.author_id;
  return new;
end;
$$;

create or replace function public.create_club_post_notifications()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  club_owner uuid;
  club_name text;
begin
  -- Only owner-authored posts associated with a club generate this notification.
  if new.club_id is null then return new; end if;

  select owner_id, name
    into club_owner, club_name
  from public.clubs
  where id = new.club_id;

  if club_owner is null or new.author_id <> club_owner then
    return new;
  end if;

  insert into public.notifications (
    recipient_id,
    actor_id,
    club_id,
    post_id,
    type,
    title,
    body
  )
  select
    membership.member_id,
    new.author_id,
    new.club_id,
    new.id,
    'club_post',
    coalesce(club_name, 'Your club'),
    'The club owner shared a new post.'
  from public.club_memberships as membership
  where membership.club_id = new.club_id
    and membership.status = 'active'
    and membership.member_id <> new.author_id
    and not exists (
      select 1
      from public.notifications as existing
      where existing.recipient_id = membership.member_id
        and existing.post_id = new.id
        and existing.type = 'club_post'
    );

  return new;
end;
$$;

drop trigger if exists community_post_owner_club_notification on public.community_posts;
create trigger community_post_owner_club_notification
after insert on public.community_posts
for each row execute procedure public.create_club_post_notifications();

-- Prepare notifications for a future in-app Realtime subscription while RLS
-- continues to restrict each recipient to their own rows.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1
       from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'notifications'
     ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end;
$$;

notify pgrst, 'reload schema';
commit;
