-- Add a per-character edit-session lock so only one editor (owner or DM) can
-- modify the character sheet at a time. The existing owner-write and dm-write
-- RLS policies already cover updates to these columns; no new policies needed.

alter table public.characters
  add column if not exists editing_by    uuid references auth.users(id) on delete set null,
  add column if not exists editing_since timestamptz;
