-- Account-scoped Explore activity state. Activity records are currently seeded in the app,
-- so these tables store their stable IDs without duplicating activity metadata.
create table if not exists public.saved_activities (
  user_id uuid not null references auth.users (id) on delete cascade,
  activity_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, activity_id)
);

create table if not exists public.activity_registrations (
  user_id uuid not null references auth.users (id) on delete cascade,
  activity_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, activity_id)
);

alter table public.saved_activities enable row level security;
alter table public.activity_registrations enable row level security;

drop policy if exists "Users read their saved activities" on public.saved_activities;
create policy "Users read their saved activities"
on public.saved_activities for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "Users save their own activities" on public.saved_activities;
create policy "Users save their own activities"
on public.saved_activities for insert to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists "Users unsave their own activities" on public.saved_activities;
create policy "Users unsave their own activities"
on public.saved_activities for delete to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "Users read their registrations" on public.activity_registrations;
create policy "Users read their registrations"
on public.activity_registrations for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "Users register themselves" on public.activity_registrations;
create policy "Users register themselves"
on public.activity_registrations for insert to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists "Users cancel their registrations" on public.activity_registrations;
create policy "Users cancel their registrations"
on public.activity_registrations for delete to authenticated
using (user_id = (select auth.uid()));

grant select, insert, delete on public.saved_activities to authenticated;
grant select, insert, delete on public.activity_registrations to authenticated;
