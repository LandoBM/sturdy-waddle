-- Rebrand the user-facing fallback text used by club join notifications.
-- Historical migrations remain unchanged for reproducibility.

begin;

create or replace function public.create_club_join_request_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  club_owner uuid;
  club_name text;
  requester_name text;
begin
  if new.status <> 'pending' then return new; end if;

  select owner_id, name into club_owner, club_name
  from public.clubs where id = new.club_id;
  if club_owner is null or club_owner = new.member_id then return new; end if;

  select coalesce(nullif(display_name, ''), username, 'A Roava member') into requester_name
  from public.profiles where id = new.member_id;

  insert into public.notifications (recipient_id, actor_id, club_id, membership_id, type, title, body)
  values (
    club_owner,
    new.member_id,
    new.club_id,
    new.id,
    'club_join_request',
    'New club join request',
    coalesce(requester_name, 'A Roava member') || ' wants to join ' || coalesce(club_name, 'your club') || '.'
  );
  return new;
end;
$$;

notify pgrst, 'reload schema';
commit;
