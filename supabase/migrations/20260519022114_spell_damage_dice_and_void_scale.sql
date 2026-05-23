-- Add damage_dice to character_spells so spells with damage can be rolled in encounters
ALTER TABLE character_spells
  ADD COLUMN IF NOT EXISTS damage_dice text;

-- Change will_of_void scale from 0-10 to 0-5
UPDATE characters SET will_of_void = LEAST(will_of_void, 5);
ALTER TABLE characters DROP CONSTRAINT IF EXISTS characters_will_of_void_check;
ALTER TABLE characters ADD CONSTRAINT characters_will_of_void_check
  CHECK (will_of_void >= 0 AND will_of_void <= 5);

-- Add void_alignment to party_stats (DM-editable, 0-10 global campaign stat)
ALTER TABLE party_stats
  ADD COLUMN IF NOT EXISTS void_alignment int NOT NULL DEFAULT 0
  CONSTRAINT party_stats_void_alignment_check CHECK (void_alignment >= 0 AND void_alignment <= 10);
