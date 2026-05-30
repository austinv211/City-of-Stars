-- Limited-use class resources (Rage, Ki/Focus, Channel Divinity, Bardic Inspiration,
-- Second Wind, Action Surge, Superiority/Sorcery points, Lay on Hands, Wild Shape, …).
-- RLS mirrors the character_spells pattern (owner full / member read / DM write).

CREATE TABLE IF NOT EXISTS public.character_resources (
  id           uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.characters(id) on delete cascade,
  name         text not null,
  current      int not null default 0,
  max          int not null default 0,
  recharge     text not null default 'long_rest',  -- short_rest | long_rest | other
  sort_order   int not null default 0,
  created_at   timestamptz not null default now()
);

ALTER TABLE public.character_resources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "character_resources: owner full" ON public.character_resources;
CREATE POLICY "character_resources: owner full" ON public.character_resources
  FOR ALL
  USING  (EXISTS (SELECT 1 FROM public.characters c WHERE c.id = character_id AND c.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.characters c WHERE c.id = character_id AND c.owner_id = auth.uid()));

DROP POLICY IF EXISTS "character_resources: campaign member read" ON public.character_resources;
CREATE POLICY "character_resources: campaign member read" ON public.character_resources
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.characters c
    WHERE c.id = character_id AND public.is_campaign_member(c.campaign_id)
  ));

DROP POLICY IF EXISTS "character_resources: dm write" ON public.character_resources;
CREATE POLICY "character_resources: dm write" ON public.character_resources
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.characters c
    JOIN public.campaign_members cm ON cm.campaign_id = c.campaign_id
    WHERE c.id = character_resources.character_id AND cm.user_id = auth.uid() AND cm.role = 'dm'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.characters c
    JOIN public.campaign_members cm ON cm.campaign_id = c.campaign_id
    WHERE c.id = character_resources.character_id AND cm.user_id = auth.uid() AND cm.role = 'dm'
  ));

ALTER TABLE public.character_resources REPLICA IDENTITY FULL;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.character_resources;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS character_resources_character_id_idx ON public.character_resources (character_id);
