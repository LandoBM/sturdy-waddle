create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  expo_push_token text not null unique,
  platform text not null check (platform in ('ios', 'android')),
  updated_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users (id) on delete cascade,
  actor_id uuid references auth.users (id) on delete set null,
  post_id uuid references public.community_posts (id) on delete cascade,
  type text not null check (type in ('follow', 'new_post', 'comment', 'like')),
  title text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_recipient_created_at_idx
  on public.notifications (recipient_id, created_at desc);

alter table public.push_tokens enable row level security;
alter table public.notifications enable row level security;

drop policy if exists "Users manage their push tokens" on public.push_tokens;
create policy "Users manage their push tokens"
on public.push_tokens for all to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists "Users can read their notifications" on public.notifications;
create policy "Users can read their notifications"
on public.notifications for select to authenticated
using (recipient_id = (select auth.uid()));

drop policy if exists "Users can mark their notifications read" on public.notifications;
create policy "Users can mark their notifications read"
on public.notifications for update to authenticated
using (recipient_id = (select auth.uid()))
with check (recipient_id = (select auth.uid()));

grant select, insert, update, delete on public.push_tokens to authenticated;
grant select, update on public.notifications to authenticated;

create or replace function public.create_follow_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  followed_profile uuid;
  actor_name text;
begin
  select id into followed_profile from public.profiles where username = new.following_username;
  if followed_profile is null or followed_profile = new.follower_id then return new; end if;
  select coalesce(nullif(display_name, ''), username, 'Someone') into actor_name from public.profiles where id = new.follower_id;
  insert into public.notifications (recipient_id, actor_id, type, title, body)
  values (followed_profile, new.follower_id, 'follow', 'New follower', actor_name || ' started following you.');
  return new;
end;
$$;

drop trigger if exists user_follow_created_notification on public.user_follows;
create trigger user_follow_created_notification
after insert on public.user_follows
for each row execute procedure public.create_follow_notification();

create or replace function public.create_post_notifications()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  author_name text;
begin
  select coalesce(nullif(display_name, ''), username, 'Someone') into author_name from public.profiles where id = new.author_id;
  insert into public.notifications (recipient_id, actor_id, post_id, type, title, body)
  select follower_id, new.author_id, new.id, 'new_post', 'New post from ' || author_name, left(new.body, 120)
  from public.user_follows
  join public.profiles on public.profiles.username = user_follows.following_username
  where public.profiles.id = new.author_id;
  return new;
end;
$$;

drop trigger if exists community_post_created_notification on public.community_posts;
create trigger community_post_created_notification
after insert on public.community_posts
for each row execute procedure public.create_post_notifications();

notify pgrst, 'reload schema';
