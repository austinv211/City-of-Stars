-- ─────────────────────────────────────────────────────────────────────────────
-- Custom wild magic surges.
--
-- The DM keeps a surge table per campaign (their own d100 table, or hand-
-- picked entries) and applies a surge to a character, in or out of combat.
--
--   wild_magic_surges   the table. DM only: players should be surprised.
--   character_surges    a surge that happened to someone. Every member reads
--                       it, so the whole table sees it land; it stays active
--                       until the DM or the character's player ends it.
--
-- In combat, applying a surge also adds an encounter effect to that
-- character's combatant, so it shows on the encounter screen with the rest
-- of the effects and ticks down like them. Ending the surge removes it.
--
-- Applying goes through apply_wild_magic_surge so the d100 is rolled on the
-- server and the copy, the effect and the log entry land in one transaction.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.wild_magic_surges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  -- The d100 range that rolls this entry. Both null: only ever picked by hand.
  roll_min int CHECK (roll_min BETWEEN 1 AND 100),
  roll_max int CHECK (roll_max BETWEEN 1 AND 100),
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 120),
  description text,
  -- In combat, how many rounds the effect lasts; null until someone ends it.
  lasts_rounds int CHECK (lasts_rounds BETWEEN 1 AND 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wild_magic_surges_range
    CHECK ((roll_min IS NULL) = (roll_max IS NULL) AND (roll_min IS NULL OR roll_min <= roll_max))
);

CREATE INDEX IF NOT EXISTS wild_magic_surges_campaign_idx
  ON public.wild_magic_surges (campaign_id, roll_min);

CREATE TABLE IF NOT EXISTS public.character_surges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  character_id uuid NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  surge_id uuid REFERENCES public.wild_magic_surges(id) ON DELETE SET NULL,
  roll int CHECK (roll BETWEEN 1 AND 100),
  -- Copied from the table entry, so editing the table never rewrites history.
  name text NOT NULL,
  description text,
  effect_id uuid REFERENCES public.encounter_effects(id) ON DELETE SET NULL,
  applied_by uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz
);

CREATE INDEX IF NOT EXISTS character_surges_campaign_idx
  ON public.character_surges (campaign_id, created_at DESC);
CREATE INDEX IF NOT EXISTS character_surges_character_idx
  ON public.character_surges (character_id) WHERE ended_at IS NULL;
CREATE INDEX IF NOT EXISTS character_surges_effect_idx
  ON public.character_surges (effect_id);
CREATE INDEX IF NOT EXISTS character_surges_surge_idx
  ON public.character_surges (surge_id);

-- ── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.wild_magic_surges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.character_surges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wild_magic_surges: dm read" ON public.wild_magic_surges;
CREATE POLICY "wild_magic_surges: dm read" ON public.wild_magic_surges
  FOR SELECT TO authenticated USING (public.is_campaign_dm(campaign_id));
DROP POLICY IF EXISTS "wild_magic_surges: dm insert" ON public.wild_magic_surges;
CREATE POLICY "wild_magic_surges: dm insert" ON public.wild_magic_surges
  FOR INSERT TO authenticated WITH CHECK (public.is_campaign_dm(campaign_id));
DROP POLICY IF EXISTS "wild_magic_surges: dm update" ON public.wild_magic_surges;
CREATE POLICY "wild_magic_surges: dm update" ON public.wild_magic_surges
  FOR UPDATE TO authenticated
  USING (public.is_campaign_dm(campaign_id)) WITH CHECK (public.is_campaign_dm(campaign_id));
DROP POLICY IF EXISTS "wild_magic_surges: dm delete" ON public.wild_magic_surges;
CREATE POLICY "wild_magic_surges: dm delete" ON public.wild_magic_surges
  FOR DELETE TO authenticated USING (public.is_campaign_dm(campaign_id));

-- Applied surges: read by members; written only through the functions below.
DROP POLICY IF EXISTS "character_surges: members read" ON public.character_surges;
CREATE POLICY "character_surges: members read" ON public.character_surges
  FOR SELECT TO authenticated USING (public.is_campaign_member(campaign_id));
DROP POLICY IF EXISTS "character_surges: dm delete" ON public.character_surges;
CREATE POLICY "character_surges: dm delete" ON public.character_surges
  FOR DELETE TO authenticated USING (public.is_campaign_dm(campaign_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.wild_magic_surges TO authenticated;
GRANT SELECT, DELETE ON public.character_surges TO authenticated;

-- ── Apply ───────────────────────────────────────────────────────────────────
-- p_surge_id picks an entry; otherwise p_roll (or a server d100) looks one up
-- by range, falling back to a random entry if no range covers the roll.
CREATE OR REPLACE FUNCTION public.apply_wild_magic_surge(
  p_character_id uuid,
  p_surge_id uuid DEFAULT NULL,
  p_roll int DEFAULT NULL
)
RETURNS public.character_surges
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_campaign uuid;
  v_roll int := p_roll;
  v_surge public.wild_magic_surges;
  v_participant uuid;
  v_encounter uuid;
  v_effect uuid;
  v_row public.character_surges;
BEGIN
  SELECT c.campaign_id INTO v_campaign FROM public.characters c WHERE c.id = p_character_id;
  IF v_campaign IS NULL OR NOT public.is_campaign_dm(v_campaign) THEN
    RAISE EXCEPTION 'apply_wild_magic_surge: only the campaign DM may apply a surge'
      USING ERRCODE = '42501';
  END IF;

  IF p_surge_id IS NOT NULL THEN
    SELECT * INTO v_surge FROM public.wild_magic_surges
    WHERE id = p_surge_id AND campaign_id = v_campaign;
  ELSE
    v_roll := coalesce(v_roll, 1 + floor(random() * 100)::int);
    SELECT * INTO v_surge FROM public.wild_magic_surges
    WHERE campaign_id = v_campaign AND v_roll BETWEEN roll_min AND roll_max
    ORDER BY roll_min LIMIT 1;
    IF NOT FOUND THEN
      SELECT * INTO v_surge FROM public.wild_magic_surges
      WHERE campaign_id = v_campaign ORDER BY random() LIMIT 1;
    END IF;
  END IF;

  IF v_surge.id IS NULL THEN
    RAISE EXCEPTION 'apply_wild_magic_surge: this campaign has no surge like that yet'
      USING ERRCODE = 'P0002';
  END IF;

  -- In combat? Then it goes on the combatant too.
  SELECT ep.id, ep.encounter_id INTO v_participant, v_encounter
  FROM public.encounter_participants ep
  JOIN public.encounters e ON e.id = ep.encounter_id
  WHERE ep.character_id = p_character_id AND e.status = 'active'
  ORDER BY e.created_at DESC
  LIMIT 1;

  IF v_participant IS NOT NULL THEN
    INSERT INTO public.encounter_effects
      (encounter_id, target_participant_id, name, description, expiry, rounds_remaining)
    VALUES (
      v_encounter, v_participant, 'Wild Magic: ' || v_surge.name, v_surge.description,
      CASE WHEN v_surge.lasts_rounds IS NULL THEN 'manual' ELSE 'rounds' END,
      v_surge.lasts_rounds
    )
    RETURNING id INTO v_effect;
  END IF;

  INSERT INTO public.character_surges
    (campaign_id, character_id, surge_id, roll, name, description, effect_id)
  VALUES (v_campaign, p_character_id, v_surge.id, v_roll, v_surge.name, v_surge.description, v_effect)
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

-- ── End ─────────────────────────────────────────────────────────────────────
-- The DM, or the player whose character it is (shaking it off, or the
-- effect simply ran its course out of combat).
CREATE OR REPLACE FUNCTION public.end_wild_magic_surge(p_id uuid)
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.character_surges;
BEGIN
  SELECT cs.* INTO v_row FROM public.character_surges cs WHERE cs.id = p_id;
  IF v_row.id IS NULL OR NOT (
    public.is_campaign_dm(v_row.campaign_id)
    OR EXISTS (SELECT 1 FROM public.characters c WHERE c.id = v_row.character_id AND c.owner_id = auth.uid())
  ) THEN
    RAISE EXCEPTION 'end_wild_magic_surge: not your surge to end' USING ERRCODE = '42501';
  END IF;

  UPDATE public.character_surges SET ended_at = now() WHERE id = p_id AND ended_at IS NULL;
  IF v_row.effect_id IS NOT NULL THEN
    DELETE FROM public.encounter_effects WHERE id = v_row.effect_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_wild_magic_surge(uuid, uuid, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_wild_magic_surge(uuid, uuid, int) TO authenticated;
REVOKE ALL ON FUNCTION public.end_wild_magic_surge(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.end_wild_magic_surge(uuid) TO authenticated;

-- An effect that expires on its own (rounds ran out, encounter ended) ends
-- the surge with it, so the character sheet does not keep showing it.
CREATE OR REPLACE FUNCTION public.end_surge_with_effect()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.character_surges
     SET ended_at = coalesce(ended_at, now())
   WHERE effect_id = OLD.id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_end_surge_with_effect ON public.encounter_effects;
CREATE TRIGGER trg_end_surge_with_effect
  BEFORE DELETE ON public.encounter_effects
  FOR EACH ROW EXECUTE FUNCTION public.end_surge_with_effect();

REVOKE ALL ON FUNCTION public.end_surge_with_effect() FROM PUBLIC, anon, authenticated;

-- ── Realtime ────────────────────────────────────────────────────────────────
ALTER TABLE public.character_surges REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'character_surges'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.character_surges;
  END IF;
END $$;
