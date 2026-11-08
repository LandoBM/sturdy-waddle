-- Read-only verification for 202611070005_club_post_notifications.sql.
-- Run in Supabase SQL Editor after applying the migration.

-- 1. Existing notification table and required columns.
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'notifications'
order by ordinal_position;

-- 2. Notification RLS and policies. Use relrowsecurity; do not query
-- non-existent relforcerowsecurity columns.
select
  c.relname as table_name,
  c.relrowsecurity as row_security_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname = 'notifications';

select schemaname, tablename, policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'notifications'
order by policyname;

-- 3. Club-post notification type and trusted function.
select conname, pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'public.notifications'::regclass
  and conname = 'notifications_type_check';

select
  p.oid::regprocedure as function_name,
  p.prosecdef as security_definer,
  pg_get_userbyid(p.proowner) as function_owner,
  p.proconfig,
  pg_get_functiondef(p.oid) as definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'create_club_post_notifications';

select trigger_name, event_manipulation, event_object_table, action_timing
from information_schema.triggers
where trigger_schema = 'public'
  and trigger_name = 'community_post_owner_club_notification';

-- 4. Realtime publication membership.
select pubname, schemaname, tablename
from pg_publication_tables
where pubname = 'supabase_realtime'
  and schemaname = 'public'
  and tablename = 'notifications';

-- 5. Existing records remain intact; this is informational only.
select 'clubs' as table_name, count(*)::bigint as row_count from public.clubs
union all
select 'club_memberships', count(*)::bigint from public.club_memberships
union all
select 'community_posts', count(*)::bigint from public.community_posts
union all
select 'notifications', count(*)::bigint from public.notifications;

-- 6. Optional post-application verification for one known club owner post.
-- Replace the UUID literals before running; this query is read-only.
-- select n.id, n.recipient_id, n.actor_id, n.club_id, n.post_id,
--        n.type, n.title, n.body, n.read_at, n.created_at
-- from public.notifications n
-- where n.club_id = '00000000-0000-0000-0000-000000000000'::uuid
--   and n.post_id = '00000000-0000-0000-0000-000000000000'::uuid
--   and n.type = 'club_post'
-- order by n.created_at desc;
