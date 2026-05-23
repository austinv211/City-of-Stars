-- 2024 ruleset character trackers: status, defenses, senses, movement, attunement.
-- Idempotent so it is safe whether applied via `supabase db push` or the MCP.

ALTER TABLE public.characters
  ADD COLUMN IF NOT EXISTS exhaustion int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS heroic_inspiration boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS size text NOT NULL DEFAULT 'Medium',
  ADD COLUMN IF NOT EXISTS conditions text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS concentrating_on text,
  ADD COLUMN IF NOT EXISTS damage_resistances text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS damage_immunities text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS damage_vulnerabilities text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS condition_immunities text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS darkvision int,
  ADD COLUMN IF NOT EXISTS blindsight int,
  ADD COLUMN IF NOT EXISTS tremorsense int,
  ADD COLUMN IF NOT EXISTS truesight int,
  ADD COLUMN IF NOT EXISTS fly_speed int,
  ADD COLUMN IF NOT EXISTS swim_speed int,
  ADD COLUMN IF NOT EXISTS climb_speed int,
  ADD COLUMN IF NOT EXISTS burrow_speed int;

DO $$ BEGIN
  ALTER TABLE public.characters
    ADD CONSTRAINT characters_exhaustion_range CHECK (exhaustion >= 0 AND exhaustion <= 6);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.characters
    ADD CONSTRAINT characters_size_valid CHECK (size IN ('Tiny','Small','Medium','Large','Huge','Gargantuan'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.character_inventory
  ADD COLUMN IF NOT EXISTS is_attuned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS requires_attunement boolean NOT NULL DEFAULT false;
