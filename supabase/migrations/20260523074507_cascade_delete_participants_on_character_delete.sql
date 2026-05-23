-- Cascade-delete encounter participants when their linked character is deleted,
-- and advance the encounter turn if the removed participant held the current turn.
-- (Recovered from the remote migration history; previously applied but missing locally.)

-- 1. Trigger: advance the encounter turn when the current participant is deleted
CREATE OR REPLACE FUNCTION fn_advance_turn_on_participant_delete()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_next_id uuid;
BEGIN
  -- Only act if this participant is the current turn holder
  IF NOT EXISTS (
    SELECT 1 FROM encounters
    WHERE id = OLD.encounter_id AND current_participant_id = OLD.id
  ) THEN
    RETURN OLD;
  END IF;

  -- Try to find the next participant by initiative order (excluding the one being deleted)
  SELECT id INTO v_next_id
  FROM encounter_participants
  WHERE encounter_id = OLD.encounter_id
    AND id != OLD.id
    AND initiative_order > OLD.initiative_order
  ORDER BY initiative_order ASC
  LIMIT 1;

  -- Wrap around to the first participant if no one comes after
  IF v_next_id IS NULL THEN
    SELECT id INTO v_next_id
    FROM encounter_participants
    WHERE encounter_id = OLD.encounter_id
      AND id != OLD.id
    ORDER BY initiative_order ASC
    LIMIT 1;
  END IF;

  -- Advance (or NULL if this was the only participant)
  UPDATE encounters SET current_participant_id = v_next_id WHERE id = OLD.encounter_id;

  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_advance_turn_on_participant_delete
  BEFORE DELETE ON encounter_participants
  FOR EACH ROW EXECUTE FUNCTION fn_advance_turn_on_participant_delete();

-- 2. Replace the SET NULL FK with CASCADE DELETE
ALTER TABLE encounter_participants
  DROP CONSTRAINT encounter_participants_character_id_fkey;

ALTER TABLE encounter_participants
  ADD CONSTRAINT encounter_participants_character_id_fkey
  FOREIGN KEY (character_id)
  REFERENCES characters(id)
  ON DELETE CASCADE;

-- 3. Remove any existing orphaned player participant rows (character_id already NULL
--    from the old SET NULL behaviour — these are characters that were already deleted)
DELETE FROM encounter_participants
WHERE character_id IS NULL AND is_player = true;
