-- ── Extend custom_monsters with full D&D 5e stat block ───────────────────────
ALTER TABLE public.custom_monsters
  ADD COLUMN IF NOT EXISTS portrait_url         text,
  ADD COLUMN IF NOT EXISTS size                 text    not null default 'Medium',
  ADD COLUMN IF NOT EXISTS type                 text    not null default 'humanoid',
  ADD COLUMN IF NOT EXISTS alignment            text,
  ADD COLUMN IF NOT EXISTS speed                int     not null default 30,
  ADD COLUMN IF NOT EXISTS cr                   text    not null default '0',
  ADD COLUMN IF NOT EXISTS xp                   int     not null default 0,
  ADD COLUMN IF NOT EXISTS str_score            int     not null default 10,
  ADD COLUMN IF NOT EXISTS dex_score            int     not null default 10,
  ADD COLUMN IF NOT EXISTS con_score            int     not null default 10,
  ADD COLUMN IF NOT EXISTS int_score            int     not null default 10,
  ADD COLUMN IF NOT EXISTS wis_score            int     not null default 10,
  ADD COLUMN IF NOT EXISTS cha_score            int     not null default 10,
  ADD COLUMN IF NOT EXISTS actions              jsonb   not null default '[]',
  ADD COLUMN IF NOT EXISTS special_abilities    jsonb   not null default '[]',
  ADD COLUMN IF NOT EXISTS legendary_actions    jsonb   not null default '[]',
  ADD COLUMN IF NOT EXISTS damage_resistances   text[]  not null default '{}',
  ADD COLUMN IF NOT EXISTS damage_immunities    text[]  not null default '{}',
  ADD COLUMN IF NOT EXISTS condition_immunities text[]  not null default '{}',
  ADD COLUMN IF NOT EXISTS senses               text,
  ADD COLUMN IF NOT EXISTS languages            text;

-- ── Extend encounter_participants with per-participant ability scores and actions ──────
ALTER TABLE public.encounter_participants
  ADD COLUMN IF NOT EXISTS str_score         int,
  ADD COLUMN IF NOT EXISTS dex_score         int,
  ADD COLUMN IF NOT EXISTS con_score         int,
  ADD COLUMN IF NOT EXISTS int_score         int,
  ADD COLUMN IF NOT EXISTS wis_score         int,
  ADD COLUMN IF NOT EXISTS cha_score         int,
  ADD COLUMN IF NOT EXISTS actions           jsonb,
  ADD COLUMN IF NOT EXISTS special_abilities jsonb;

-- ── Monster portrait storage bucket ──────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'monster-portraits',
  'monster-portraits',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "monster-portraits: public read" ON storage.objects;
CREATE POLICY "monster-portraits: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'monster-portraits');

DROP POLICY IF EXISTS "monster-portraits: auth insert" ON storage.objects;
CREATE POLICY "monster-portraits: auth insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'monster-portraits'
    AND auth.uid()::text = (string_to_array(name, '/'))[1]
  );

DROP POLICY IF EXISTS "monster-portraits: auth update" ON storage.objects;
CREATE POLICY "monster-portraits: auth update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'monster-portraits'
    AND auth.uid()::text = (string_to_array(name, '/'))[1]
  );

DROP POLICY IF EXISTS "monster-portraits: auth delete" ON storage.objects;
CREATE POLICY "monster-portraits: auth delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'monster-portraits'
    AND auth.uid()::text = (string_to_array(name, '/'))[1]
  );
