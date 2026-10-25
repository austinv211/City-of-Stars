-- ─────────────────────────────────────────────────────────────────────────────
-- Restrict which columns a player may change on their own encounter row.
--
-- "encounter_participants: owner update own" is USING/WITH CHECK
-- (owner_id = auth.uid()) with no column list, so a player could rewrite ANY
-- column of their own participant. Verified by src/test/db/participants.db.test.ts
-- against the local stack: a player could move their row into another
-- encounter (encounter_id), detach or swap its character (character_id),
-- flip is_player, jump the turn order (initiative_order), and raise their own
-- hp_max and ac, grant themselves damage_immunities, or rename themselves.
--
-- ── What a player legitimately writes ───────────────────────────────────────
-- Read off every client write path (useEncounterParticipants.ts,
-- InitiativeRollScreen.tsx), so the encounter screen keeps working unchanged:
--   damage / healing     hp_current, hp_temp
--   dying                death_save_successes, death_save_failures
--   status               conditions, concentrating_on, cover, heroic_inspiration
--   turn economy         action_used, bonus_used, reaction_used, dodging
--   own initiative roll  initiative_score, has_rolled_initiative
--
-- This is an ALLOWLIST: the row minus these keys must be unchanged. A column
-- added later is therefore pinned by default, rather than silently writable
-- until someone remembers to add it to a deny list.
--
-- ── What is NOT restricted ──────────────────────────────────────────────────
-- * The campaign DM: may change anything, as before.
-- * SECURITY DEFINER paths, which run as the function owner rather than as
--   `authenticated`: sync_character_to_participants (mirrors the character
--   sheet -- ac, hp_max, resistances, exhaustion -- onto the row),
--   reorder_initiative (writes initiative_order after a player's roll), and
--   advance_encounter_turn (resets the turn flags). Those are the sanctioned
--   ways the pinned columns change, and they keep working.
-- * The service role.
--
-- Not a column GRANT: the DM and the player are the same `authenticated`
-- role, so a role-level column grant cannot tell them apart.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.pin_player_participant_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  player_writable CONSTANT text[] := ARRAY[
    'hp_current', 'hp_temp',
    'death_save_successes', 'death_save_failures',
    'conditions', 'concentrating_on', 'cover', 'heroic_inspiration',
    'action_used', 'bonus_used', 'reaction_used', 'dodging',
    'initiative_score', 'has_rolled_initiative'
  ];
BEGIN
  -- Only a signed-in user's own request is restricted; see header.
  IF current_user <> 'authenticated' THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.encounters e
    WHERE e.id = OLD.encounter_id
      AND public.is_campaign_dm(e.campaign_id)
  ) THEN
    RETURN NEW;
  END IF;

  IF (to_jsonb(NEW) - player_writable) IS DISTINCT FROM (to_jsonb(OLD) - player_writable) THEN
    RAISE EXCEPTION 'encounter_participants: a player may only change combat state on their own row'
      USING ERRCODE = '42501',
            HINT = 'Stats come from the character sheet; turn order from reorder_initiative.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pin_player_participant_columns ON public.encounter_participants;
CREATE TRIGGER trg_pin_player_participant_columns
  BEFORE UPDATE ON public.encounter_participants
  FOR EACH ROW
  EXECUTE FUNCTION public.pin_player_participant_columns();

-- A trigger function, not API: keep it off /rest/v1/rpc, as 20261021000002 did
-- for the others. Triggers fire regardless of the caller's EXECUTE privilege.
REVOKE ALL ON FUNCTION public.pin_player_participant_columns() FROM PUBLIC, anon, authenticated;
