-- ─────────────────────────────────────────────────────────────────────────────
-- §3.3(b) Tracked effects with durations.
--
-- Bless, Hold Person, a Shove's prone-until-your-next-turn: today the DM keeps
-- these in their head. A row per effect, ticked by advance_encounter_turn
-- (20261025000006), lets the stage show rounds remaining and lets expiry
-- happen on its own.
--
-- Expiry modes, all relative to turns rather than wall time:
--   start_of_source_next_turn  e.g. "until the start of your next turn"
--   end_of_source_next_turn    e.g. Vicious Mockery's disadvantage
--   end_of_target_next_turn    e.g. a save-ends-at-end-of-turn rider
--   rounds                     rounds_remaining, ticked at the start of the
--                              source's turn (or on the round wrap if sourceless)
--   concentration              ends when the source stops concentrating
--   manual                     only the DM (or the source) removes it
--
-- "Next turn" is decided with encounters.turn_seq, not the round -- see
-- 20261025000002 for why.
-- ─────────────────────────────────────────────────────────────────────────────

-- The composite foreign keys below need (id, encounter_id) to be unique. It
-- already is (id is the primary key); this just makes it referenceable.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'encounter_participants_id_encounter_key'
  ) THEN
    ALTER TABLE public.encounter_participants
      ADD CONSTRAINT encounter_participants_id_encounter_key UNIQUE (id, encounter_id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.encounter_effects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id uuid NOT NULL REFERENCES public.encounters(id) ON DELETE CASCADE,
  target_participant_id uuid NOT NULL,
  source_participant_id uuid,
  name text NOT NULL CHECK (length(btrim(name)) > 0),
  description text,
  expiry text NOT NULL CHECK (expiry IN (
    'start_of_source_next_turn', 'end_of_source_next_turn', 'end_of_target_next_turn',
    'rounds', 'concentration', 'manual'
  )),
  rounds_remaining int,
  -- Stamped by trg_stamp_encounter_effect, never trusted from the client.
  created_round int NOT NULL DEFAULT 1,
  created_turn_seq int NOT NULL DEFAULT 0,
  created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),

  -- Target and source must be combatants in THIS encounter.
  CONSTRAINT encounter_effects_target_fkey
    FOREIGN KEY (target_participant_id, encounter_id)
    REFERENCES public.encounter_participants (id, encounter_id) ON DELETE CASCADE,
  CONSTRAINT encounter_effects_source_fkey
    FOREIGN KEY (source_participant_id, encounter_id)
    REFERENCES public.encounter_participants (id, encounter_id)
    ON DELETE SET NULL (source_participant_id),

  CONSTRAINT encounter_effects_rounds_need_count
    CHECK (expiry <> 'rounds' OR rounds_remaining >= 1),
  -- Every mode except rounds/manual is defined relative to the source.
  CONSTRAINT encounter_effects_source_relative_need_source
    CHECK (expiry NOT IN ('start_of_source_next_turn', 'end_of_source_next_turn', 'concentration')
           OR source_participant_id IS NOT NULL)
);

-- Realtime filter index, matching 20260522014511.
CREATE INDEX IF NOT EXISTS encounter_effects_encounter_id_idx
  ON public.encounter_effects (encounter_id);
CREATE INDEX IF NOT EXISTS encounter_effects_target_idx
  ON public.encounter_effects (target_participant_id);
CREATE INDEX IF NOT EXISTS encounter_effects_source_idx
  ON public.encounter_effects (source_participant_id);

-- ── Stamp the creation point server-side ────────────────────────────────────
-- A client-supplied created_turn_seq could backdate an effect so it expires
-- early (or never). Always take it from the encounter.
CREATE OR REPLACE FUNCTION public.stamp_encounter_effect()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  SELECT e.round, e.turn_seq
    INTO NEW.created_round, NEW.created_turn_seq
  FROM public.encounters e
  WHERE e.id = NEW.encounter_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_stamp_encounter_effect ON public.encounter_effects;
CREATE TRIGGER trg_stamp_encounter_effect
  BEFORE INSERT ON public.encounter_effects
  FOR EACH ROW EXECUTE FUNCTION public.stamp_encounter_effect();

-- ── Concentration ends its effects immediately ──────────────────────────────
-- Not at the next turn boundary: losing concentration (failed save, new
-- concentration spell, dropped to 0 HP) ends the spell at once. SECURITY
-- DEFINER because the player whose save failed may not own the effect rows.
CREATE OR REPLACE FUNCTION public.end_concentration_effects()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.encounter_effects
  WHERE source_participant_id = NEW.id
    AND expiry = 'concentration';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_end_concentration_effects ON public.encounter_participants;
CREATE TRIGGER trg_end_concentration_effects
  AFTER UPDATE OF concentrating_on ON public.encounter_participants
  FOR EACH ROW
  WHEN (OLD.concentrating_on IS DISTINCT FROM NEW.concentrating_on)
  EXECUTE FUNCTION public.end_concentration_effects();

-- ── Turn-boundary expiry ────────────────────────────────────────────────────
-- Called only by advance_encounter_turn, with the turn that is ending
-- (p_prev, which ran under sequence p_prev_seq) and the turn that is starting
-- (p_next). Not API: revoked below.
CREATE OR REPLACE FUNCTION public.tick_encounter_effects(
  p_encounter_id uuid,
  p_prev uuid,
  p_prev_seq int,
  p_next uuid,
  p_wrapped boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- End of the outgoing turn. created_turn_seq < p_prev_seq means the effect
  -- predates this turn, so this turn was the creature's "next" one.
  IF p_prev IS NOT NULL THEN
    DELETE FROM public.encounter_effects
    WHERE encounter_id = p_encounter_id
      AND created_turn_seq < p_prev_seq
      AND (
        (expiry = 'end_of_source_next_turn' AND source_participant_id = p_prev)
        OR (expiry = 'end_of_target_next_turn' AND target_participant_id = p_prev)
      );
  END IF;

  IF p_next IS NOT NULL THEN
    -- Start of the incoming turn: always after creation.
    DELETE FROM public.encounter_effects
    WHERE encounter_id = p_encounter_id
      AND expiry = 'start_of_source_next_turn'
      AND source_participant_id = p_next;

    -- Round-counted: expire on the last round, then count the rest down.
    -- In that order, because decrementing first would briefly take a row to
    -- 0 and trip encounter_effects_rounds_need_count.
    DELETE FROM public.encounter_effects
    WHERE encounter_id = p_encounter_id
      AND expiry = 'rounds'
      AND source_participant_id = p_next
      AND rounds_remaining <= 1;
    UPDATE public.encounter_effects
       SET rounds_remaining = rounds_remaining - 1
     WHERE encounter_id = p_encounter_id
       AND expiry = 'rounds'
       AND source_participant_id = p_next;
  END IF;

  -- Sourceless round-counted effects (a lair hazard, an effect whose caster
  -- has left the fight) tick once per round, on the wrap.
  IF p_wrapped THEN
    DELETE FROM public.encounter_effects
    WHERE encounter_id = p_encounter_id
      AND expiry = 'rounds'
      AND source_participant_id IS NULL
      AND rounds_remaining <= 1;
    UPDATE public.encounter_effects
       SET rounds_remaining = rounds_remaining - 1
     WHERE encounter_id = p_encounter_id
       AND expiry = 'rounds'
       AND source_participant_id IS NULL;
  END IF;

  -- The source left the encounter: a source-relative effect can never end.
  DELETE FROM public.encounter_effects
  WHERE encounter_id = p_encounter_id
    AND expiry IN ('start_of_source_next_turn', 'end_of_source_next_turn', 'concentration')
    AND source_participant_id IS NULL;
END;
$$;

-- ── RLS ─────────────────────────────────────────────────────────────────────
-- One policy per action, each TO authenticated, rather than a DM "FOR ALL"
-- overlapping a member read and a player write: overlapping permissive
-- policies are all evaluated for every row (the multiple_permissive_policies
-- advisor). auth.uid() is wrapped in a subselect so it is evaluated once per
-- statement, not per row (auth_rls_initplan). Same semantics either way:
--   read    any campaign member
--   insert  the DM, or a player placing an effect THEY are the source of
--           (casting Bless on the party, marking a target)
--   update  the DM
--   delete  the DM, or the player who is the source (ending their own mark)
ALTER TABLE public.encounter_effects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "encounter_effects: members read" ON public.encounter_effects;
CREATE POLICY "encounter_effects: members read" ON public.encounter_effects
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.encounters e
      WHERE e.id = encounter_effects.encounter_id
        AND public.is_campaign_member(e.campaign_id)
    )
  );

DROP POLICY IF EXISTS "encounter_effects: dm or source insert" ON public.encounter_effects;
CREATE POLICY "encounter_effects: dm or source insert" ON public.encounter_effects
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.encounters e
      WHERE e.id = encounter_effects.encounter_id
        AND public.is_campaign_dm(e.campaign_id)
    )
    OR EXISTS (
      SELECT 1 FROM public.encounter_participants ep
      WHERE ep.id = encounter_effects.source_participant_id
        AND ep.owner_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "encounter_effects: dm update" ON public.encounter_effects;
CREATE POLICY "encounter_effects: dm update" ON public.encounter_effects
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.encounters e
      WHERE e.id = encounter_effects.encounter_id
        AND public.is_campaign_dm(e.campaign_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.encounters e
      WHERE e.id = encounter_effects.encounter_id
        AND public.is_campaign_dm(e.campaign_id)
    )
  );

DROP POLICY IF EXISTS "encounter_effects: dm or source delete" ON public.encounter_effects;
CREATE POLICY "encounter_effects: dm or source delete" ON public.encounter_effects
  FOR DELETE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.encounters e
      WHERE e.id = encounter_effects.encounter_id
        AND public.is_campaign_dm(e.campaign_id)
    )
    OR EXISTS (
      SELECT 1 FROM public.encounter_participants ep
      WHERE ep.id = encounter_effects.source_participant_id
        AND ep.owner_id = (SELECT auth.uid())
    )
  );

-- ── Realtime ────────────────────────────────────────────────────────────────
-- FULL to match the project's realtime tables (20260521073830). Note it does
-- NOT make a DELETE carry the effect's name to clients: with RLS enabled,
-- Realtime sends only the primary key of a deleted row. The client keeps the
-- names it already has (useEncounterEffects).
ALTER TABLE public.encounter_effects REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public'
      AND tablename = 'encounter_effects'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.encounter_effects;
  END IF;
END $$;

-- ── Not API ─────────────────────────────────────────────────────────────────
REVOKE ALL ON FUNCTION public.stamp_encounter_effect() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.end_concentration_effects() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tick_encounter_effects(uuid, uuid, int, uuid, boolean)
  FROM PUBLIC, anon, authenticated;
