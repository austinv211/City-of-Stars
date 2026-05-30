-- 2024 attack rules: thrown, two-weapon (light), and weapon mastery.
-- Thrown weapons use the melee ability modifier even at range (STR, or the
-- better of STR/DEX when also Finesse) — flag it so the live attack-roll
-- computation doesn't fall back to DEX. Light weapons enable a Two-Weapon
-- Fighting off-hand attack. Mastery stores the weapon's 2024 mastery property
-- (Cleave, Graze, Nick, Push, Sap, Slow, Topple, Vex) for surfacing in combat.
ALTER TABLE public.character_attacks
  ADD COLUMN IF NOT EXISTS is_thrown boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_light boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mastery text;
