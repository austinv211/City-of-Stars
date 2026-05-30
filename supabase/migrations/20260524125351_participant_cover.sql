-- Transient combat cover on a participant (DM/player-set). Combat-only, so it is
-- NOT synced from the character.
ALTER TABLE public.encounter_participants
  ADD COLUMN IF NOT EXISTS cover text NOT NULL DEFAULT 'none';

DO $$ BEGIN
  ALTER TABLE public.encounter_participants
    ADD CONSTRAINT encounter_participants_cover_valid
    CHECK (cover IN ('none', 'half', 'three_quarters', 'total'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
