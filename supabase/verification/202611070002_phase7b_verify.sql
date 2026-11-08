-- FitHive Phase 7B read-only verification.
-- Run this in the Supabase SQL Editor after applying the Phase 7B migration.
-- This script performs SELECTs only and does not rerun or modify any migration.

-- 1. Required club columns and existing ownership relationship.
select
  c.column_name,
  c.data_type,
  c.is_nullable,
  c.column_default
from information_schema.columns c
where c.table_schema = 'public'
  and c.table_name = 'clubs'
  and c.column_name in (
    'id', 'owner_id', 'name', 'description', 'location', 'activity',
    'image_url', 'visibility', 'badge_url', 'cover_image_url',
    'background_color', 'sport_id'
  )
order by c.ordinal_position;

select
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  ccu.table_schema as referenced_schema,
  ccu.table_name as referenced_table,
  ccu.column_name as referenced_column
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on kcu.constraint_schema = tc.constraint_schema
 and kcu.constraint_name = tc.constraint_name
 and kcu.table_name = tc.table_name
join information_schema.constraint_column_usage ccu
  on ccu.constraint_schema = tc.constraint_schema
 and ccu.constraint_name = tc.constraint_name
where tc.table_schema = 'public'
  and tc.table_name = 'clubs'
  and kcu.column_name = 'owner_id';

-- 2. community_posts.club_id and its foreign key.
select
  c.column_name,
  c.data_type,
  c.is_nullable
from information_schema.columns c
where c.table_schema = 'public'
  and c.table_name = 'community_posts'
  and c.column_name = 'club_id';

select
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name as referenced_table,
  ccu.column_name as referenced_column,
  rc.delete_rule
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on kcu.constraint_schema = tc.constraint_schema
 and kcu.constraint_name = tc.constraint_name
 and kcu.table_name = tc.table_name
join information_schema.constraint_column_usage ccu
  on ccu.constraint_schema = tc.constraint_schema
 and ccu.constraint_name = tc.constraint_name
left join information_schema.referential_constraints rc
  on rc.constraint_schema = tc.constraint_schema
 and rc.constraint_name = tc.constraint_name
where tc.table_schema = 'public'
  and tc.table_name = 'community_posts'
  and kcu.column_name = 'club_id';

-- 3. Required helper functions and RLS policies.
select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  p.prosecdef as security_definer
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('is_club_manager', 'can_read_club', 'can_post_to_club')
order by p.proname;

select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and (
    tablename in ('clubs', 'club_memberships', 'club_updates', 'community_posts')
    or policyname in (
      'Club owners and managers update clubs',
      'Users read permitted club updates',
      'Club managers publish updates',
      'Club managers edit their updates',
      'Users create permitted community posts',
      'Users edit their permitted community posts',
      'Users read permitted community posts',
      'Members can leave clubs except owners'
    )
  )
order by tablename, policyname;

select
  n.nspname as schemaname,
  c.relname as tablename,
  c.relrowsecurity as rowsecurity,
  c.relforcerowsecurity as forcerowsecurity
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relname in ('clubs', 'club_memberships', 'club_updates', 'community_posts')
order by c.relname;

-- 4. Storage bucket and storage policies.
select
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
from storage.buckets
where id = 'club-media';

select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
  and policyname in (
    'Users read permitted club media',
    'Club managers upload club media',
    'Club managers update club media',
    'Club managers delete club media'
  )
order by policyname;

-- 5. Non-destructive integrity counts and orphan checks.
select 'clubs' as table_name, count(*)::bigint as row_count from public.clubs
union all
select 'club_memberships', count(*)::bigint from public.club_memberships
union all
select 'club_updates', count(*)::bigint from public.club_updates
union all
select 'community_posts', count(*)::bigint from public.community_posts
union all
select 'post_likes', count(*)::bigint from public.post_likes
union all
select 'post_comments', count(*)::bigint from public.post_comments;

select count(*)::bigint as orphaned_club_owners
from public.clubs c
left join auth.users u on u.id = c.owner_id
where u.id is null;

select count(*)::bigint as orphaned_memberships
from public.club_memberships m
left join public.clubs c on c.id = m.club_id
left join auth.users u on u.id = m.member_id
where c.id is null or u.id is null;

select count(*)::bigint as orphaned_club_posts
from public.community_posts p
left join public.clubs c on c.id = p.club_id
where p.club_id is not null and c.id is null;

-- Expected high-level results:
-- * clubs includes badge_url, cover_image_url, background_color, sport_id.
-- * community_posts.club_id references public.clubs(id) with ON DELETE SET NULL.
-- * the three helper functions exist and are SECURITY DEFINER.
-- * club-media exists with public = false, 10 MB limit, and jpeg/png/webp types.
-- * all orphan counts are 0.
