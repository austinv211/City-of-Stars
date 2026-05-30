-- Versatile weapons: the two-handed damage die (e.g. Longsword 1d8 → 1d10).
-- Null = not versatile. Damage count reuses dice_count.
ALTER TABLE public.character_attacks
  ADD COLUMN IF NOT EXISTS versatile_sides int;
