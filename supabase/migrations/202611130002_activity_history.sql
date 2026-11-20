begin;

create table if not exists public.user_activity_history (
  user_id uuid not null references auth.users (id) on delete cascade,
  activity_id text not null,
  activity jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, activity_id),
  constraint user_activity_history_completed check ((activity ->> 'status') = 'completed'),
  constraint user_activity_history_id check (length(activity_id) > 0)
);

create index if not exists user_activity_history_user_completed_idx
  on public.user_activity_history (user_id, ((activity ->> 'endedAt')));

alter table public.user_activity_history enable row level security;

drop policy if exists "Users can read their activity history" on public.user_activity_history;
create policy "Users can read their activity history"
on public.user_activity_history for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "Users can insert their activity history" on public.user_activity_history;
create policy "Users can insert their activity history"
on public.user_activity_history for insert to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists "Users can update their activity history" on public.user_activity_history;
create policy "Users can update their activity history"
on public.user_activity_history for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

grant select, insert, update on public.user_activity_history to authenticated;

commit;
