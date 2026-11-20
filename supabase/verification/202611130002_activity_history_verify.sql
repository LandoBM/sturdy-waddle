-- Read-only verification for the activity history migration.
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'user_activity_history'
order by ordinal_position;

select schemaname, tablename, policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'user_activity_history'
order by policyname;

select relname as table_name, relrowsecurity as row_security_enabled
from pg_class
join pg_namespace on pg_namespace.oid = pg_class.relnamespace
where pg_namespace.nspname = 'public'
  and relname = 'user_activity_history';
