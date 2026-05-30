-- Snapshot the character fields the encounter combat flow needs onto participants
-- (defenses for typed damage, concentration + death saves for automation), and
-- extend the live-sync trigger to keep them current.

ALTER TABLE public.encounter_participants
  ADD COLUMN IF NOT EXISTS damage_resistances text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS damage_immunities text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS damage_vulnerabilities text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS concentrating_on text,
  ADD COLUMN IF NOT EXISTS death_save_successes int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS death_save_failures int NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.sync_character_to_participants()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.encounter_participants ep
  SET
    ac                    = COALESCE(NEW.ac, ep.ac),
    hp_max                = COALESCE(NEW.hp_max, ep.hp_max),
    hp_current            = COALESCE(NEW.hp_current, ep.hp_current),
    hp_temp               = NEW.hp_temp,
    conditions            = NEW.conditions,
    concentrating_on      = NEW.concentrating_on,
    death_save_successes  = NEW.death_save_successes,
    death_save_failures   = NEW.death_save_failures,
    damage_resistances    = NEW.damage_resistances,
    damage_immunities     = NEW.damage_immunities,
    damage_vulnerabilities = NEW.damage_vulnerabilities
  FROM public.encounters e
  WHERE ep.character_id = NEW.id
    AND ep.encounter_id = e.id
    AND e.status <> 'completed';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_character_to_participants ON public.characters;
CREATE TRIGGER trg_sync_character_to_participants
AFTER UPDATE OF ac, hp_max, hp_current, hp_temp, conditions, concentrating_on,
                death_save_successes, death_save_failures,
                damage_resistances, damage_immunities, damage_vulnerabilities
ON public.characters
FOR EACH ROW
WHEN (
  OLD.ac IS DISTINCT FROM NEW.ac OR
  OLD.hp_max IS DISTINCT FROM NEW.hp_max OR
  OLD.hp_current IS DISTINCT FROM NEW.hp_current OR
  OLD.hp_temp IS DISTINCT FROM NEW.hp_temp OR
  OLD.conditions IS DISTINCT FROM NEW.conditions OR
  OLD.concentrating_on IS DISTINCT FROM NEW.concentrating_on OR
  OLD.death_save_successes IS DISTINCT FROM NEW.death_save_successes OR
  OLD.death_save_failures IS DISTINCT FROM NEW.death_save_failures OR
  OLD.damage_resistances IS DISTINCT FROM NEW.damage_resistances OR
  OLD.damage_immunities IS DISTINCT FROM NEW.damage_immunities OR
  OLD.damage_vulnerabilities IS DISTINCT FROM NEW.damage_vulnerabilities
)
EXECUTE FUNCTION public.sync_character_to_participants();
