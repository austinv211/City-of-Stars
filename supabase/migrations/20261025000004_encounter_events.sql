-- ─────────────────────────────────────────────────────────────────────────────
-- §3.3(c) Encounter event log: the basis for DM undo, the end-of-encounter
-- highlights reel, and a real audit trail for the realtime-race bugs that
-- docs/progress_notes.md chronicles.
--
-- Deviation from the plan, deliberately: the plan had every mutation in
-- useEncounterParticipants.ts insert its own event row. Client-written logs
-- can be skipped (a crashed tab, a second code path that forgets) and forged
-- (any member could insert anything). So events are written by triggers in
-- the same transaction as the change they describe, with the real auth.uid()
-- as actor, and NO client role -- player or DM -- can insert, update or delete
-- a row. Append-only is then a property of the grants, not of good behaviour.
--
-- Undo does not delete history: the DM restores `payload.before` through an
-- ordinary update, which is itself logged.
--
-- Only ACTIVE encounters are logged, so editing a template or a pending
-- encounter's roster does not fill the log.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.encounter_events (
  id bigserial PRIMARY KEY,
  encounter_id uuid NOT NULL REFERENCES public.encounters(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  round int,
  kind text NOT NULL CHECK (kind IN (
    'damage', 'heal', 'death_save', 'condition', 'concentration', 'status',
    'turn', 'effect_added', 'effect_removed'
  )),
  -- No FK: an event must outlive the combatant it describes (a monster that
  -- died and was removed still belongs in the highlights reel).
  participant_id uuid,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS encounter_events_encounter_id_idx
  ON public.encounter_events (encounter_id, id);

-- ── Participant changes ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.log_participant_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  -- The columns whose history is worth having. Turn-economy flags and
  -- initiative are left out: they churn every turn and are not undoable.
  tracked CONSTANT text[] := ARRAY[
    'hp_current', 'hp_temp', 'death_save_successes', 'death_save_failures',
    'conditions', 'concentrating_on', 'exhaustion', 'heroic_inspiration'
  ];
  v_old jsonb := to_jsonb(OLD);
  v_new jsonb := to_jsonb(NEW);
  v_before jsonb := '{}'::jsonb;
  v_after jsonb := '{}'::jsonb;
  v_col text;
  v_kind text;
  v_round int;
BEGIN
  SELECT e.round INTO v_round
  FROM public.encounters e
  WHERE e.id = NEW.encounter_id AND e.status = 'active';
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  FOREACH v_col IN ARRAY tracked LOOP
    IF v_old -> v_col IS DISTINCT FROM v_new -> v_col THEN
      v_before := v_before || jsonb_build_object(v_col, v_old -> v_col);
      v_after := v_after || jsonb_build_object(v_col, v_new -> v_col);
    END IF;
  END LOOP;

  IF v_after = '{}'::jsonb THEN
    RETURN NEW; -- nothing tracked changed (e.g. a no-op sync from the sheet)
  END IF;

  -- Most significant change names the event; the payload carries all of them.
  v_kind := CASE
    WHEN (v_after ? 'hp_current' AND NEW.hp_current < OLD.hp_current)
      OR (v_after ? 'hp_temp' AND NEW.hp_temp < OLD.hp_temp) THEN 'damage'
    WHEN v_after ? 'hp_current' OR v_after ? 'hp_temp' THEN 'heal'
    WHEN v_after ? 'death_save_successes' OR v_after ? 'death_save_failures' THEN 'death_save'
    WHEN v_after ? 'conditions' THEN 'condition'
    WHEN v_after ? 'concentrating_on' THEN 'concentration'
    ELSE 'status'
  END;

  INSERT INTO public.encounter_events (encounter_id, actor_id, round, kind, participant_id, payload)
  VALUES (
    NEW.encounter_id, auth.uid(), v_round, v_kind, NEW.id,
    jsonb_build_object('name', NEW.name, 'before', v_before, 'after', v_after)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_participant_event ON public.encounter_participants;
CREATE TRIGGER trg_log_participant_event
  AFTER UPDATE ON public.encounter_participants
  FOR EACH ROW EXECUTE FUNCTION public.log_participant_event();

-- ── Effect changes ──────────────────────────────────────────────────────────
-- Expiry included: a tick that ends Bless shows up in the log as removed.
CREATE OR REPLACE FUNCTION public.log_effect_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.encounter_effects := CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  v_round int;
BEGIN
  SELECT e.round INTO v_round
  FROM public.encounters e
  WHERE e.id = v_row.encounter_id AND e.status = 'active';
  IF NOT FOUND THEN
    RETURN NULL; -- also covers the encounter itself being deleted
  END IF;

  INSERT INTO public.encounter_events (encounter_id, actor_id, round, kind, participant_id, payload)
  VALUES (
    v_row.encounter_id, auth.uid(), v_round,
    CASE WHEN TG_OP = 'DELETE' THEN 'effect_removed' ELSE 'effect_added' END,
    v_row.target_participant_id,
    jsonb_build_object('effect', to_jsonb(v_row))
  );
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_effect_event ON public.encounter_effects;
CREATE TRIGGER trg_log_effect_event
  AFTER INSERT OR DELETE ON public.encounter_effects
  FOR EACH ROW EXECUTE FUNCTION public.log_effect_event();

-- ── RLS + grants ────────────────────────────────────────────────────────────
ALTER TABLE public.encounter_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "encounter_events: members read" ON public.encounter_events;
CREATE POLICY "encounter_events: members read" ON public.encounter_events
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.encounters e
      WHERE e.id = encounter_events.encounter_id
        AND public.is_campaign_member(e.campaign_id)
    )
  );

-- Belt and braces: with no write policy RLS already refuses, but revoking the
-- privileges means a policy added carelessly later still cannot open it up.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.encounter_events FROM anon, authenticated;
REVOKE USAGE ON SEQUENCE public.encounter_events_id_seq FROM anon, authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public'
      AND tablename = 'encounter_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.encounter_events;
  END IF;
END $$;

REVOKE ALL ON FUNCTION public.log_participant_event() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.log_effect_event() FROM PUBLIC, anon, authenticated;
