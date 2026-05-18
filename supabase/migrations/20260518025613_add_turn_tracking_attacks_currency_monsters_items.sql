-- ── Turn tracking on encounters ───────────────────────────────────────────────
ALTER TABLE public.encounters
  ADD COLUMN current_participant_id uuid;

-- ── Dollar currency on characters (modern-day campaign) ───────────────────────
ALTER TABLE public.characters
  ADD COLUMN currency_dollars int not null default 0;

-- ── Character attacks ─────────────────────────────────────────────────────────
CREATE TABLE public.character_attacks (
  id             uuid primary key default gen_random_uuid(),
  character_id   uuid not null references public.characters(id) on delete cascade,
  name           text not null,
  attack_modifier int not null default 0,
  dice_count     int not null default 1,
  dice_sides     int not null default 6,
  damage_modifier int not null default 0,
  damage_type    text not null default 'slashing',
  is_ranged      boolean not null default false,
  notes          text,
  created_at     timestamptz not null default now()
);

ALTER TABLE public.character_attacks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "character_attacks: owner full" ON public.character_attacks
  FOR ALL
  USING  (EXISTS (SELECT 1 FROM public.characters c WHERE c.id = character_id AND c.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.characters c WHERE c.id = character_id AND c.owner_id = auth.uid()));

CREATE POLICY "character_attacks: campaign member read" ON public.character_attacks
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.characters c
    WHERE c.id = character_id AND public.is_campaign_member(c.campaign_id)
  ));

-- ── DM-defined custom monsters ────────────────────────────────────────────────
CREATE TABLE public.custom_monsters (
  id                 uuid primary key default gen_random_uuid(),
  campaign_id        uuid not null references public.campaigns(id) on delete cascade,
  name               text not null,
  hp                 int not null default 10,
  ac                 int not null default 12,
  default_initiative int not null default 0,
  created_by         uuid references auth.users(id),
  created_at         timestamptz not null default now()
);

ALTER TABLE public.custom_monsters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "custom_monsters: dm write" ON public.custom_monsters
  FOR ALL
  USING  (public.is_campaign_dm(campaign_id))
  WITH CHECK (public.is_campaign_dm(campaign_id));

CREATE POLICY "custom_monsters: member read" ON public.custom_monsters
  FOR SELECT USING (public.is_campaign_member(campaign_id));

-- ── Shared campaign item catalogue ────────────────────────────────────────────
CREATE TABLE public.campaign_items (
  id          uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  item_name   text not null,
  description text,
  weight      numeric,
  created_by  uuid references auth.users(id),
  created_at  timestamptz not null default now()
);

ALTER TABLE public.campaign_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "campaign_items: member read" ON public.campaign_items
  FOR SELECT USING (public.is_campaign_member(campaign_id));

CREATE POLICY "campaign_items: member insert" ON public.campaign_items
  FOR INSERT WITH CHECK (public.is_campaign_member(campaign_id));

CREATE POLICY "campaign_items: dm or creator delete" ON public.campaign_items
  FOR DELETE USING (public.is_campaign_dm(campaign_id) OR created_by = auth.uid());

-- ── advance_encounter_turn RPC ────────────────────────────────────────────────
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

  UPDATE public.encounters SET current_participant_id = v_next_id WHERE id = p_encounter_id;
END;
$$;
