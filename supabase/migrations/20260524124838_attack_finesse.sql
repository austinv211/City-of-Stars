-- Finesse weapons use the higher of STR/DEX. Flag it on attacks so the live
-- attack-roll computation can pick the better modifier.
ALTER TABLE public.character_attacks
  ADD COLUMN IF NOT EXISTS is_finesse boolean NOT NULL DEFAULT false;
