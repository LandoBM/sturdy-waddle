begin;

create table if not exists public.post_tags (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts (id) on delete cascade,
  tagged_profile_id uuid references public.profiles (id) on delete cascade,
  tagged_club_id uuid references public.clubs (id) on delete cascade,
  source text not null default 'tag' check (source in ('tag', 'mention')),
  created_at timestamptz not null default now(),
  constraint post_tags_exactly_one_target check (
    (tagged_profile_id is not null)::integer + (tagged_club_id is not null)::integer = 1
  )
);

create unique index if not exists post_tags_profile_unique
  on public.post_tags (post_id, tagged_profile_id, source)
  where tagged_profile_id is not null;

create unique index if not exists post_tags_club_unique
  on public.post_tags (post_id, tagged_club_id, source)
  where tagged_club_id is not null;

create index if not exists post_tags_post_id_idx on public.post_tags (post_id, created_at);
create index if not exists post_tags_profile_id_idx on public.post_tags (tagged_profile_id) where tagged_profile_id is not null;
create index if not exists post_tags_club_id_idx on public.post_tags (tagged_club_id) where tagged_club_id is not null;

alter table public.post_tags enable row level security;

drop policy if exists "Users can read permitted post tags" on public.post_tags;
create policy "Users can read permitted post tags"
on public.post_tags for select to authenticated
using (exists (
  select 1
  from public.community_posts
  where community_posts.id = post_tags.post_id
    and (
      community_posts.author_id = (select auth.uid())
      or (
        community_posts.club_id is null
        and community_posts.visibility = 'public'
      )
      or (
        community_posts.club_id is not null
        and public.can_read_club(community_posts.club_id)
        and community_posts.visibility = 'public'
      )
    )
));

drop policy if exists "Post authors can create their own tags" on public.post_tags;
create policy "Post authors can create their own tags"
on public.post_tags for insert to authenticated
with check (
  exists (
    select 1
    from public.community_posts
    where community_posts.id = post_tags.post_id
      and community_posts.author_id = (select auth.uid())
  )
  and (
    (tagged_profile_id is not null and exists (select 1 from public.profiles where profiles.id = post_tags.tagged_profile_id))
    or (tagged_club_id is not null and exists (select 1 from public.clubs where clubs.id = post_tags.tagged_club_id and public.can_read_club(clubs.id)))
  )
);

drop policy if exists "Post authors can remove their own tags" on public.post_tags;
create policy "Post authors can remove their own tags"
on public.post_tags for delete to authenticated
using (exists (
  select 1
  from public.community_posts
  where community_posts.id = post_tags.post_id
    and community_posts.author_id = (select auth.uid())
));

grant select, insert, delete on public.post_tags to authenticated;

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('follow', 'new_post', 'comment', 'like', 'club_join_request', 'tag'));

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
begin
  select author_id into post_author from public.community_posts where id = new.post_id;
  if post_author is null then return new; end if;
  select coalesce(nullif(display_name, ''), username, 'Someone') into actor_name
  from public.profiles where id = post_author;

  if new.tagged_profile_id is not null then
    recipient := new.tagged_profile_id;
    if recipient = post_author then return new; end if;
    if not exists (
      select 1 from public.post_tags
      where post_id = new.post_id and tagged_profile_id = recipient and id <> new.id
    ) then
      insert into public.notifications (recipient_id, actor_id, post_id, type, title, body)
      values (recipient, post_author, new.post_id, 'tag', 'You were tagged in a post', coalesce(actor_name, 'Someone') || ' tagged you in a post.');
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
        values (recipient, post_author, new.post_id, new.tagged_club_id, 'tag', 'Your club was tagged in a post', coalesce(actor_name, 'Someone') || ' tagged your club in a post.');
      end if;
    end loop;
  end if;
  return new;
end;
$$;

drop trigger if exists post_tag_created_notification on public.post_tags;
create trigger post_tag_created_notification
after insert on public.post_tags
for each row execute procedure public.create_post_tag_notification();

notify pgrst, 'reload schema';
commit;
