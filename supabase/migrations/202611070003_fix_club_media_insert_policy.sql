-- Fix the deployed club-media INSERT policy.
-- The previous policy incorrectly called storage.foldername(clubs.name),
-- which never inspected the uploaded Storage object path.

drop policy if exists "Club managers upload club media" on storage.objects;

create policy "Club managers upload club media"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'club-media'
  and (storage.foldername(name))[2] in ('badge', 'cover')
  and exists (
    select 1
    from public.clubs
    where public.clubs.id::text = (storage.foldername(name))[1]
      and public.is_club_manager(public.clubs.id)
  )
);
