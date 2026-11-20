begin;

alter table public.notifications
  add column if not exists comment_id uuid references public.post_comments (id) on delete cascade;

alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check
  check (type in ('follow', 'new_post', 'comment', 'like', 'club_join_request', 'club_post', 'tag', 'comment_mention', 'reply'));

create index if not exists notifications_comment_id_idx
  on public.notifications (comment_id, created_at desc)
  where comment_id is not null;

create index if not exists notifications_post_interaction_idx
  on public.notifications (recipient_id, post_id, type)
  where post_id is not null and type in ('tag');

create index if not exists notifications_comment_interaction_idx
  on public.notifications (recipient_id, comment_id, type)
  where comment_id is not null and type in ('comment_mention', 'reply');

create or replace function public.create_post_tag_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  post_author uuid;
  actor_name text;
  recipient uuid;
  notification_title text;
  notification_body text;
begin
  select author_id into post_author from public.community_posts where id = new.post_id;
  if post_author is null then return new; end if;
  select coalesce(nullif(display_name, ''), username, 'Someone') into actor_name
  from public.profiles where id = post_author;

  notification_title := case when new.source = 'mention' then 'You were mentioned in a post' else 'You were tagged in a post' end;
  notification_body := coalesce(actor_name, 'Someone') || case when new.source = 'mention' then ' mentioned you in a post.' else ' tagged you in a post.' end;

  if new.tagged_profile_id is not null then
    recipient := new.tagged_profile_id;
    if recipient <> post_author and not exists (
      select 1 from public.notifications
      where recipient_id = recipient and post_id = new.post_id and type = 'tag'
    ) then
      insert into public.notifications (recipient_id, actor_id, post_id, type, title, body)
      values (recipient, post_author, new.post_id, 'tag', notification_title, notification_body);
    end if;
  else
    for recipient in
      select distinct manager_id
      from (
        select owner_id as manager_id from public.clubs where id = new.tagged_club_id
        union all
        select member_id as manager_id
        from public.club_memberships
        where club_id = new.tagged_club_id and status = 'active' and role in ('moderator', 'owner')
      ) managers
      where manager_id <> post_author
    loop
      if not exists (
        select 1 from public.notifications
        where recipient_id = recipient and post_id = new.post_id and type = 'tag'
      ) then
        insert into public.notifications (recipient_id, actor_id, post_id, club_id, type, title, body)
        values (recipient, post_author, new.post_id, new.tagged_club_id, 'tag', 'Your club was mentioned in a post', notification_body);
      end if;
    end loop;
  end if;
  return new;
end;
$$;

create or replace function public.create_comment_reply_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  parent_author uuid;
  actor_name text;
begin
  if new.parent_comment_id is null then return new; end if;
  select author_id into parent_author from public.post_comments where id = new.parent_comment_id;
  if parent_author is null or parent_author = new.author_id then return new; end if;
  if exists (
    select 1 from public.comment_tags
    where comment_id = new.id and tagged_profile_id = parent_author
  ) then return new; end if;
  select coalesce(nullif(display_name, ''), username, 'Someone') into actor_name from public.profiles where id = new.author_id;
  insert into public.notifications (recipient_id, actor_id, post_id, comment_id, type, title, body)
  select parent_author, new.author_id, new.post_id, new.id, 'reply', 'New reply to your comment', coalesce(actor_name, 'Someone') || ' replied to your comment.'
  where not exists (
    select 1 from public.notifications
    where recipient_id = parent_author and comment_id = new.id and type = 'reply'
  );
  return new;
end;
$$;

create or replace function public.create_comment_tag_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  comment_author uuid;
  post_uuid uuid;
  actor_name text;
  recipient uuid;
begin
  select author_id, post_id into comment_author, post_uuid from public.post_comments where id = new.comment_id;
  if comment_author is null then return new; end if;
  select coalesce(nullif(display_name, ''), username, 'Someone') into actor_name from public.profiles where id = comment_author;

  if new.tagged_profile_id is not null then
    recipient := new.tagged_profile_id;
    if recipient <> comment_author and not exists (
      select 1 from public.notifications
      where recipient_id = recipient and comment_id = new.comment_id and type in ('comment_mention', 'reply')
    ) then
      insert into public.notifications (recipient_id, actor_id, post_id, comment_id, type, title, body)
      values (recipient, comment_author, post_uuid, new.comment_id, 'comment_mention', 'You were mentioned in a comment', coalesce(actor_name, 'Someone') || ' mentioned you in a comment.');
    end if;
  else
    for recipient in
      select distinct manager_id
      from (
        select owner_id as manager_id from public.clubs where id = new.tagged_club_id
        union all
        select member_id as manager_id from public.club_memberships
        where club_id = new.tagged_club_id and status = 'active' and role in ('moderator', 'owner')
      ) managers
      where manager_id <> comment_author
    loop
      if not exists (
        select 1 from public.notifications
        where recipient_id = recipient and comment_id = new.comment_id and type = 'comment_mention'
      ) then
        insert into public.notifications (recipient_id, actor_id, post_id, comment_id, club_id, type, title, body)
        values (recipient, comment_author, post_uuid, new.comment_id, new.tagged_club_id, 'comment_mention', 'Your club was mentioned in a comment', coalesce(actor_name, 'Someone') || ' mentioned your club in a comment.');
      end if;
    end loop;
  end if;
  return new;
end;
$$;

drop trigger if exists post_comment_reply_notification on public.post_comments;
create trigger post_comment_reply_notification
after insert on public.post_comments
for each row execute procedure public.create_comment_reply_notification();

drop trigger if exists comment_tag_created_notification on public.comment_tags;
create trigger comment_tag_created_notification
after insert on public.comment_tags
for each row execute procedure public.create_comment_tag_notification();

notify pgrst, 'reload schema';
commit;
