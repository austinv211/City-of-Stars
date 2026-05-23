-- Phase 2.1: Expand character sheet with full 5e fields
ALTER TABLE public.characters
  ADD COLUMN IF NOT EXISTS ac               int,
  ADD COLUMN IF NOT EXISTS speed            int NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS hp_max           int,
  ADD COLUMN IF NOT EXISTS hp_current       int,
  ADD COLUMN IF NOT EXISTS hp_temp          int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hit_dice_current int,
  ADD COLUMN IF NOT EXISTS death_save_successes int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS death_save_failures  int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS personality_traits text,
  ADD COLUMN IF NOT EXISTS ideals             text,
  ADD COLUMN IF NOT EXISTS bonds              text,
  ADD COLUMN IF NOT EXISTS flaws              text,
  ADD COLUMN IF NOT EXISTS features_notes     text,
  ADD COLUMN IF NOT EXISTS will_of_void       int NOT NULL DEFAULT 0
    CHECK (will_of_void BETWEEN 0 AND 10),
  ADD COLUMN IF NOT EXISTS will_of_void_notes text,
  ADD COLUMN IF NOT EXISTS armor_proficiencies  text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS weapon_proficiencies text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS tool_proficiencies   text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS languages_known      text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS level_up_pending boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.character_spell_slots (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id   uuid NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  spell_level    int  NOT NULL CHECK (spell_level BETWEEN 1 AND 9),
  slots_total    int  NOT NULL DEFAULT 0,
  slots_expended int  NOT NULL DEFAULT 0,
  UNIQUE (character_id, spell_level)
);

ALTER TABLE public.character_spell_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "character_spell_slots_owner" ON public.character_spell_slots
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.characters c
      WHERE c.id = character_id AND c.owner_id = auth.uid()
    )
  );

CREATE POLICY "character_spell_slots_campaign_read" ON public.character_spell_slots
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.characters c
      JOIN public.campaign_members cm ON cm.campaign_id = c.campaign_id
      WHERE c.id = character_id AND cm.user_id = auth.uid()
    )
  );

CREATE TABLE IF NOT EXISTS public.character_audit_log (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  changed_by   uuid NOT NULL REFERENCES auth.users(id),
  field_name   text NOT NULL,
  old_value    text,
  new_value    text,
  changed_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.character_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "character_audit_log_insert" ON public.character_audit_log
  FOR INSERT WITH CHECK (changed_by = auth.uid());

CREATE POLICY "character_audit_log_dm_read" ON public.character_audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.characters c
      JOIN public.campaign_members cm ON cm.campaign_id = c.campaign_id
      WHERE c.id = character_id
        AND cm.user_id = auth.uid()
        AND cm.role = 'dm'
    )
  );

CREATE POLICY "character_audit_log_owner_read" ON public.character_audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.characters c
      WHERE c.id = character_id AND c.owner_id = auth.uid()
    )
  );
