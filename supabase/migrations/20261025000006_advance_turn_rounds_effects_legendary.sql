-- ─────────────────────────────────────────────────────────────────────────────
-- Wire §3.3(a)-(d) into the turn: one replacement of advance_encounter_turn
-- rather than four, so the function's final shape is reviewable in one place.
--
-- Unchanged from 20261021000001: DM-only (42501 otherwise), the same
-- next-participant selection, and resetting the incoming creature's turn
-- economy. New:
--   - round increments exactly once per wrap back to the top of the order
--     (not on the very first turn, which merely starts round 1)
--   - turn_seq increments on every advance
--   - tick_encounter_effects expires effects at the turn boundary
--   - the incoming creature's legendary_actions_remaining refills
--   - a 'turn' event is logged
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.advance_encounter_turn(p_encounter_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prev_id       uuid;
  v_prev_seq      int;
  v_round         int;
  v_current_order int;
  v_next_id       uuid;
  v_wrapped       boolean := false;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.encounters e
    WHERE e.id = p_encounter_id
      AND public.is_campaign_dm(e.campaign_id)
  ) THEN
    RAISE EXCEPTION 'advance_encounter_turn: only the campaign DM may advance the turn'
      USING ERRCODE = '42501';
  END IF;

  -- Lock the encounter row: two DM devices pressing Next at once must not
  -- both read the same turn and double-advance.
  SELECT e.current_participant_id, e.turn_seq, e.round, ep.initiative_order
    INTO v_prev_id, v_prev_seq, v_round, v_current_order
  FROM public.encounters e
  LEFT JOIN public.encounter_participants ep ON ep.id = e.current_participant_id
  WHERE e.id = p_encounter_id
  FOR UPDATE OF e;

  IF v_current_order IS NULL THEN
    -- No current turn (fresh encounter, or the holder was removed): start at
    -- the top. Not a wrap -- round 1 has not been played yet.
    SELECT id INTO v_next_id
    FROM public.encounter_participants
    WHERE encounter_id = p_encounter_id
    ORDER BY initiative_order ASC
    LIMIT 1;
  ELSE
    SELECT id INTO v_next_id
    FROM public.encounter_participants
    WHERE encounter_id = p_encounter_id
      AND initiative_order > v_current_order
    ORDER BY initiative_order ASC
    LIMIT 1;

    IF v_next_id IS NULL THEN
      v_wrapped := true;
      SELECT id INTO v_next_id
      FROM public.encounter_participants
      WHERE encounter_id = p_encounter_id
      ORDER BY initiative_order ASC
      LIMIT 1;
    END IF;
  END IF;

  IF v_wrapped THEN
    v_round := v_round + 1;
  END IF;

  UPDATE public.encounters
     SET current_participant_id = v_next_id,
         round = v_round,
         turn_seq = turn_seq + 1
   WHERE id = p_encounter_id;

  IF v_next_id IS NOT NULL THEN
    UPDATE public.encounter_participants
       SET action_used   = false,
           bonus_used    = false,
           reaction_used = false,
           dodging       = false,
           legendary_actions_remaining = legendary_actions_max
     WHERE id = v_next_id;
  END IF;

  PERFORM public.tick_encounter_effects(
    p_encounter_id, v_prev_id, v_prev_seq, v_next_id, v_wrapped
  );

  INSERT INTO public.encounter_events (encounter_id, actor_id, round, kind, participant_id, payload)
  SELECT p_encounter_id, auth.uid(), v_round, 'turn', v_next_id,
         jsonb_build_object('from', v_prev_id, 'to', v_next_id, 'wrapped', v_wrapped)
  FROM public.encounters e
  WHERE e.id = p_encounter_id AND e.status = 'active';
END;
$$;

-- Grants as set by 20261021000001; restated so this file is correct alone.
REVOKE ALL ON FUNCTION public.advance_encounter_turn(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.advance_encounter_turn(uuid) TO authenticated;
