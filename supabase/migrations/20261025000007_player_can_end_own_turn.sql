-- ─────────────────────────────────────────────────────────────────────────────
-- Let a player end their own turn.
--
-- The phase-driven stage (§3.1) gives the player whose turn it is an explicit
-- End Turn button. advance_encounter_turn was DM-only, so that button would
-- have been refused -- leaving the player to say "done" and wait for the DM.
--
-- Now: the campaign DM, OR the owner of the combatant currently holding the
-- turn, may advance it. Nobody else: a player cannot end anyone's turn but
-- their own, and an outsider or anon still cannot call it at all (grants
-- unchanged). Everything else is as in 20261025000006.
--
-- The authorisation now happens AFTER the row lock, against the locked state
-- -- see the comment in the body for the race that prevents.
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
  v_campaign_id   uuid;
  v_holder_owner  uuid;
BEGIN
  -- Lock FIRST, then authorise against the locked row. Two callers racing --
  -- a double tap on End Turn, or a player's End Turn landing just after the
  -- DM's Next -- serialise here; the second then sees the turn has already
  -- moved on and is refused, instead of advancing again and skipping someone.
  SELECT e.current_participant_id, e.turn_seq, e.round, e.campaign_id,
         ep.initiative_order, ep.owner_id
    INTO v_prev_id, v_prev_seq, v_round, v_campaign_id,
         v_current_order, v_holder_owner
  FROM public.encounters e
  LEFT JOIN public.encounter_participants ep ON ep.id = e.current_participant_id
  WHERE e.id = p_encounter_id
  FOR UPDATE OF e;

  IF NOT (
    public.is_campaign_dm(v_campaign_id)
    OR (v_holder_owner IS NOT NULL AND v_holder_owner = auth.uid())
  ) THEN
    RAISE EXCEPTION 'advance_encounter_turn: only the DM, or the player whose turn it is, may advance the turn'
      USING ERRCODE = '42501';
  END IF;

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
