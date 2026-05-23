-- Structured class/subclass/feat features a character has gained, populated from
-- srd_class_features on level-up (and on demand). RLS mirrors character_spells.

CREATE TABLE IF NOT EXISTS public.character_features (
  id            uuid primary key default gen_random_uuid(),
  character_id  uuid not null references public.characters(id) on delete cascade,
  name          text not null,
  level_gained  int not null default 1,
  source        text not null default 'class',  -- class | subclass | feat | species | background | custom
  description   text,
  choice        text,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now()
);

ALTER TABLE public.character_features ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "character_features: owner full" ON public.character_features;
CREATE POLICY "character_features: owner full" ON public.character_features
  FOR ALL
  USING  (EXISTS (SELECT 1 FROM public.characters c WHERE c.id = character_id AND c.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.characters c WHERE c.id = character_id AND c.owner_id = auth.uid()));

DROP POLICY IF EXISTS "character_features: campaign member read" ON public.character_features;
CREATE POLICY "character_features: campaign member read" ON public.character_features
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.characters c
    WHERE c.id = character_id AND public.is_campaign_member(c.campaign_id)
  ));

DROP POLICY IF EXISTS "character_features: dm write" ON public.character_features;
CREATE POLICY "character_features: dm write" ON public.character_features
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.characters c
    JOIN public.campaign_members cm ON cm.campaign_id = c.campaign_id
    WHERE c.id = character_features.character_id AND cm.user_id = auth.uid() AND cm.role = 'dm'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.characters c
    JOIN public.campaign_members cm ON cm.campaign_id = c.campaign_id
    WHERE c.id = character_features.character_id AND cm.user_id = auth.uid() AND cm.role = 'dm'
  ));

ALTER TABLE public.character_features REPLICA IDENTITY FULL;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.character_features;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS character_features_character_id_idx ON public.character_features (character_id);
