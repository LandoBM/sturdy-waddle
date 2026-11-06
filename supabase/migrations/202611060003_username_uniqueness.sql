-- Usernames are unique identifiers; display names may be shared.
-- The index is case-insensitive so Alex and alex cannot be separate usernames.

create unique index if not exists profiles_username_lower_unique
  on public.profiles (lower(username));

notify pgrst, 'reload schema';
