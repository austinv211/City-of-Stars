-- ─────────────────────────────────────────────────────────────────────────────
-- §3.3(a) Round counter, plus a monotonic turn sequence.
--
-- Nothing in the schema tracked rounds: advance_encounter_turn detected the
-- wrap back to the top of the order and did nothing with it. `round` is what
-- the turn bar shows ("R3 · Goblin's turn").
--
-- `turn_seq` is new relative to the plan, and is what makes effect expiry
-- correct. "Until the end of the target's NEXT turn" cannot be decided from
-- the round alone: an effect applied in round 3 to a creature that has not
-- acted yet in round 3 ends in round 3. With a counter bumped on every turn,
-- "X's next turn" is simply the first turn of X whose sequence number is
-- greater than the one the effect was created under.
--
-- Both are wired into advance_encounter_turn by 20261025000006.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.encounters
  ADD COLUMN IF NOT EXISTS round int NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS turn_seq int NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'encounters_round_positive') THEN
    ALTER TABLE public.encounters
      ADD CONSTRAINT encounters_round_positive CHECK (round >= 1);
  END IF;
END $$;
