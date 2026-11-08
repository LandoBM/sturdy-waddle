-- FitHive Phase 7B: incremental club schema and security.
-- Review only: do not apply automatically.
-- This migration preserves clubs, club_memberships, club_updates, and all
-- existing community_posts. It does not create duplicate tables or migrate
-- legacy club_updates into community_posts.

begin;

-- The existing clubs.owner_id already references auth.users(id). Profiles use
-- the same id as their primary key, so the owner public profile is retrieved
-- through profiles.id without duplicating owner data on clubs.
alter table public.clubs
  add column if not exists badge_url text,
  add column if not exists cover_image_url text,
  add column if not exists background_color text,
  add column if not exists sport_id text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.clubs'::regclass
      and conname = 'clubs_background_color_hex'
  ) then
    alter table public.clubs
      add constraint clubs_background_color_hex
      check (background_color is null or background_color ~ '^#[0-9A-Fa-f]{6}$');
  end if;
end;
$$;

create index if not exists clubs_sport_id_idx on public.clubs (sport_id);

-- Attach new shared social posts to a club without disturbing the existing
-- free-form community_posts.club field or any existing post rows.
alter table public.community_posts
  add column if not exists club_id uuid references public.clubs (id) on delete set null;

create index if not exists community_posts_club_created_at_idx
  on public.community_posts (club_id, created_at desc)
  where club_id is not null;

-- These helpers are security-definer functions so membership checks do not
-- recurse through the RLS policies that protect club_memberships.
create or replace function public.is_club_manager(p_club_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.clubs
    where clubs.id = p_club_id
      and clubs.owner_id = (select auth.uid())
  )
  or exists (
    select 1
    from public.club_memberships
    where club_memberships.club_id = p_club_id
      and club_memberships.member_id = (select auth.uid())
      and club_memberships.status = 'active'
      and club_memberships.role in ('moderator', 'owner')
  );
$$;

create or replace function public.can_read_club(p_club_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.clubs
    where clubs.id = p_club_id
      and (
        clubs.visibility = 'public'
        or clubs.owner_id = (select auth.uid())
        or exists (
          select 1
          from public.club_memberships
          where club_memberships.club_id = clubs.id
            and club_memberships.member_id = (select auth.uid())
            and club_memberships.status = 'active'
        )
      )
  );
$$;

create or replace function public.can_post_to_club(p_club_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_club_manager(p_club_id)
    or exists (
      select 1
      from public.club_memberships
      where club_memberships.club_id = p_club_id
        and club_memberships.member_id = (select auth.uid())
        and club_memberships.status = 'active'
    );
$$;

grant execute on function public.is_club_manager(uuid) to authenticated;
grant execute on function public.can_read_club(uuid) to authenticated;
grant execute on function public.can_post_to_club(uuid) to authenticated;

-- Replace the existing owner-only update policy with an owner/moderator
-- policy. owner_id is intentionally not granted as an updateable column.
drop policy if exists "Verified owners update their clubs" on public.clubs;
create policy "Club owners and managers update clubs"
on public.clubs for update to authenticated
using (public.is_club_manager(id))
with check (public.is_club_manager(id));

grant update (
  name, description, activity, location, image_url, visibility,
  badge_url, cover_image_url, background_color, sport_id, updated_at
) on public.clubs to authenticated;

-- Private clubs and their legacy updates follow club visibility. Existing
-- club_updates rows remain untouched.
drop policy if exists "Club updates are public" on public.club_updates;
create policy "Users read permitted club updates"
on public.club_updates for select to authenticated
using (public.can_read_club(club_id));

drop policy if exists "Verified owners publish updates" on public.club_updates;
create policy "Club managers publish updates"
on public.club_updates for insert to authenticated
with check (
  author_id = (select auth.uid())
  and public.is_club_manager(club_id)
);

drop policy if exists "Verified owners edit updates" on public.club_updates;
create policy "Club managers edit their updates"
on public.club_updates for update to authenticated
using (
  author_id = (select auth.uid())
  and public.is_club_manager(club_id)
)
with check (
  author_id = (select auth.uid())
  and public.is_club_manager(club_id)
);

-- The Phase 6 policy allowed every user to attach their own post to any
-- private club. Replace it with a policy that permits ordinary posts without
-- a club, but requires active membership or club-management rights when
-- club_id is supplied.
drop policy if exists "Users can create their own community posts" on public.community_posts;
create policy "Users create permitted community posts"
on public.community_posts for insert to authenticated
with check (
  author_id = (select auth.uid())
  and (club_id is null or public.can_post_to_club(club_id))
);

drop policy if exists "Users can edit their own community posts" on public.community_posts;
create policy "Users edit their permitted community posts"
on public.community_posts for update to authenticated
using (
  author_id = (select auth.uid())
  and (club_id is null or public.can_post_to_club(club_id))
)
with check (
  author_id = (select auth.uid())
  and (club_id is null or public.can_post_to_club(club_id))
);

drop policy if exists "Authenticated users can read public posts" on public.community_posts;
create policy "Users read permitted community posts"
on public.community_posts for select to authenticated
using (
  (
    club_id is null
    and (visibility = 'public' or author_id = (select auth.uid()))
  )
  or (
    club_id is not null
    and public.can_read_club(club_id)
    and (visibility = 'public' or author_id = (select auth.uid()) or public.is_club_manager(club_id))
  )
);

grant update (club_id, visibility, body, image_url, location, club, updated_at)
  on public.community_posts to authenticated;
grant select, insert, update on public.club_updates to authenticated;

-- Members may leave only when they are not the club owner. Ownership is never
-- transferable through this migration and owner_id is not client-updateable.
drop policy if exists "Members can leave clubs" on public.club_memberships;
create policy "Members can leave clubs except owners"
on public.club_memberships for delete to authenticated
using (
  member_id = (select auth.uid())
  and not exists (
    select 1 from public.clubs
    where clubs.id = club_memberships.club_id
      and clubs.owner_id = (select auth.uid())
  )
);

-- Private club media lives in a dedicated private bucket. The first path
-- segment must be the club UUID, followed by badge/ or cover/. Clients should
-- use signed URLs for private media; public-club visibility can be resolved
-- by the same permitted-read policy.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'club-media', 'club-media', false, 10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users read permitted club media" on storage.objects;
create policy "Users read permitted club media"
on storage.objects for select to authenticated
using (
  bucket_id = 'club-media'
  and exists (
    select 1
    from public.clubs
    where clubs.id::text = (storage.foldername(name))[1]
      and public.can_read_club(clubs.id)
  )
);

drop policy if exists "Club managers upload club media" on storage.objects;
create policy "Club managers upload club media"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'club-media'
  and (storage.foldername(name))[2] in ('badge', 'cover')
  and exists (
    select 1
    from public.clubs
    where clubs.id::text = (storage.foldername(name))[1]
      and public.is_club_manager(clubs.id)
  )
);

drop policy if exists "Club managers update club media" on storage.objects;
create policy "Club managers update club media"
on storage.objects for update to authenticated
using (
  bucket_id = 'club-media'
  and (storage.foldername(name))[2] in ('badge', 'cover')
  and exists (
    select 1
    from public.clubs
    where clubs.id::text = (storage.foldername(name))[1]
      and public.is_club_manager(clubs.id)
  )
)
with check (
  bucket_id = 'club-media'
  and (storage.foldername(name))[2] in ('badge', 'cover')
  and exists (
    select 1
    from public.clubs
    where clubs.id::text = (storage.foldername(name))[1]
      and public.is_club_manager(clubs.id)
  )
);

drop policy if exists "Club managers delete club media" on storage.objects;
create policy "Club managers delete club media"
on storage.objects for delete to authenticated
using (
  bucket_id = 'club-media'
  and exists (
    select 1
    from public.clubs
    where clubs.id::text = (storage.foldername(name))[1]
      and public.is_club_manager(clubs.id)
  )
);

notify pgrst, 'reload schema';
commit;
