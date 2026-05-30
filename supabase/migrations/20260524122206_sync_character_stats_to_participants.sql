-- Live-sync character stats that affect encounter behavior (AC, HP, conditions)
-- onto that character's participant rows in any non-completed encounter.
-- Runs server-side so it propagates regardless of which client made the edit,
-- and the participant change is broadcast via realtime to all viewers.

CREATE OR REPLACE FUNCTION public.sync_character_to_participants()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.encounter_participants ep
  SET
    ac         = COALESCE(NEW.ac, ep.ac),
    hp_max     = COALESCE(NEW.hp_max, ep.hp_max),
    hp_current = COALESCE(NEW.hp_current, ep.hp_current),
    hp_temp    = NEW.hp_temp,
    conditions = NEW.conditions
  FROM public.encounters e
  WHERE ep.character_id = NEW.id
    AND ep.encounter_id = e.id
    AND e.status <> 'completed';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_character_to_participants ON public.characters;
CREATE TRIGGER trg_sync_character_to_participants
AFTER UPDATE OF ac, hp_max, hp_current, hp_temp, conditions ON public.characters
FOR EACH ROW
WHEN (
  OLD.ac IS DISTINCT FROM NEW.ac OR
  OLD.hp_max IS DISTINCT FROM NEW.hp_max OR
  OLD.hp_current IS DISTINCT FROM NEW.hp_current OR
  OLD.hp_temp IS DISTINCT FROM NEW.hp_temp OR
  OLD.conditions IS DISTINCT FROM NEW.conditions
)
EXECUTE FUNCTION public.sync_character_to_participants();
