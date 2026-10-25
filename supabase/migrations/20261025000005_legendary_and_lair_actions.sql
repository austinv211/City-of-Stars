-- ─────────────────────────────────────────────────────────────────────────────
-- §3.3(d) Legendary and lair actions.
--
-- custom_monsters.legendary_actions exists and is editable in the monster
-- library, but nothing carried it into an encounter: npcInsertRow and
-- runTemplate map only `actions` and `special_abilities`, so a legendary
-- monster arrived without its legendary actions. These columns give it
-- somewhere to land, plus the per-round budget the DM spends between turns.
--
-- advance_encounter_turn (20261025000006) refills
-- legendary_actions_remaining at the start of that creature's own turn, per
-- the rules.
--
-- lair_action_initiative: conventionally 20, losing ties. Null means the
-- encounter has no lair.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.encounter_participants
  ADD COLUMN IF NOT EXISTS legendary_actions jsonb,
  ADD COLUMN IF NOT EXISTS legendary_actions_max int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS legendary_actions_remaining int NOT NULL DEFAULT 0;

ALTER TABLE public.encounters
  ADD COLUMN IF NOT EXISTS lair_action_initiative int;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'encounter_participants_legendary_budget') THEN
    ALTER TABLE public.encounter_participants
      ADD CONSTRAINT encounter_participants_legendary_budget
      CHECK (legendary_actions_max >= 0
             AND legendary_actions_remaining BETWEEN 0 AND legendary_actions_max);
  END IF;
END $$;
