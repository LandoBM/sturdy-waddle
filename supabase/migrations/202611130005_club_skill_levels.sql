-- Additive club skill-level metadata. Existing clubs remain unspecified until
-- an authorized owner or manager chooses one or more levels.
alter table public.clubs
  add column if not exists skill_levels text[] not null default '{}'::text[];

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.clubs'::regclass
      and conname = 'clubs_skill_levels_valid'
  ) then
    alter table public.clubs
      add constraint clubs_skill_levels_valid
      check (skill_levels <@ array['beginner', 'intermediate', 'experienced']::text[]);
  end if;
end $$;

grant update (skill_levels) on public.clubs to authenticated;
