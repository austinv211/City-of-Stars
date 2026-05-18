-- Spellcasting ability on characters (null = non-caster)
ALTER TABLE public.characters ADD COLUMN spellcasting_ability text;

-- Mark attacks that are spell attacks vs weapon attacks
ALTER TABLE public.character_attacks ADD COLUMN is_spell boolean not null default false;

-- Full spell list per character
CREATE TABLE public.character_spells (
  id             uuid primary key default gen_random_uuid(),
  character_id   uuid not null references public.characters(id) on delete cascade,
  name           text not null,
  level          int not null default 0,   -- 0 = cantrip
  school         text,
  is_prepared    boolean not null default false,
  is_ritual      boolean not null default false,
  concentration  boolean not null default false,
  casting_time   text,
  range_text     text,
  components     text[],
  description    text,
  damage_type    text,
  attack_type    text,
  created_at     timestamptz not null default now()
);

ALTER TABLE public.character_spells ENABLE ROW LEVEL SECURITY;

CREATE POLICY "character_spells: owner full" ON public.character_spells
  FOR ALL
  USING  (EXISTS (SELECT 1 FROM public.characters c WHERE c.id = character_id AND c.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.characters c WHERE c.id = character_id AND c.owner_id = auth.uid()));

CREATE POLICY "character_spells: campaign member read" ON public.character_spells
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.characters c
    WHERE c.id = character_id AND public.is_campaign_member(c.campaign_id)
  ));
