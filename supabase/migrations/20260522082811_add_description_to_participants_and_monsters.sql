
ALTER TABLE public.encounter_participants
  ADD COLUMN IF NOT EXISTS description text;

ALTER TABLE public.custom_monsters
  ADD COLUMN IF NOT EXISTS description text;
