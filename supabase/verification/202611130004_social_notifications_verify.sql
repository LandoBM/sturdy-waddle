-- Read-only verification for post/comment mention and reply notifications.
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'notifications'
  and column_name in ('comment_id', 'post_id', 'type', 'recipient_id', 'actor_id')
order by ordinal_position;

select table_name, column_name, foreign_table_name, foreign_column_name
from information_schema.key_column_usage
where table_schema = 'public'
  and table_name in ('notifications', 'post_comments', 'comment_tags')
  and column_name in ('comment_id', 'parent_comment_id');

select schemaname, tablename, policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'comment_tags'
order by policyname;

select tg.tgname as trigger_name, cls.relname as table_name, proc.proname as function_name
from pg_trigger tg
join pg_class cls on cls.oid = tg.tgrelid
join pg_proc proc on proc.oid = tg.tgfoid
join pg_namespace ns on ns.oid = cls.relnamespace
where not tg.tgisinternal
  and ns.nspname = 'public'
  and tg.tgname in ('post_comment_reply_notification', 'comment_tag_created_notification');
