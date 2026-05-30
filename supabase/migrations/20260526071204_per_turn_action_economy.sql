-- Per-turn action economy + Dodge state on encounter participants.
-- 2024 rules: each creature gets ONE action, ONE bonus action, and ONE reaction
-- per round (reaction refreshes at the start of YOUR turn). Dodge lasts until
-- the start of your next turn, after which it ends — which is exactly when we
-- reset these flags here.
ALTER TABLE public.encounter_participants
  ADD COLUMN IF NOT EXISTS action_used boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS bonus_used boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reaction_used boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS dodging boolean NOT NULL DEFAULT false;

-- Refresh the per-turn slots and clear Dodge on the participant whose turn is
-- starting. The Dodge timing is correct: it lasts until the *start* of your
-- next turn, and that's the boundary we clear at.
CREATE OR REPLACE FUNCTION public.advance_encounter_turn(p_encounter_id uuid)
  RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_current_order int;
  v_next_id       uuid;
BEGIN
  SELECT ep.initiative_order INTO v_current_order
  FROM public.encounters e
  LEFT JOIN public.encounter_participants ep ON ep.id = e.current_participant_id
  WHERE e.id = p_encounter_id;

  IF v_current_order IS NULL THEN
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
      SELECT id INTO v_next_id
      FROM public.encounter_participants
      WHERE encounter_id = p_encounter_id
      ORDER BY initiative_order ASC
      LIMIT 1;
    END IF;
  END IF;

  IF v_next_id IS NOT NULL THEN
    UPDATE public.encounter_participants
       SET action_used = false,
           bonus_used = false,
           reaction_used = false,
           dodging = false
     WHERE id = v_next_id;
  END IF;

  UPDATE public.encounters SET current_participant_id = v_next_id WHERE id = p_encounter_id;
END;
$$;
