-- ── Extend custom_monsters with full D&D 5e stat block ───────────────────────
ALTER TABLE public.custom_monsters
  ADD COLUMN portrait_url         text,
  ADD COLUMN size                 text    not null default 'Medium',
  ADD COLUMN type                 text    not null default 'humanoid',
  ADD COLUMN alignment            text,
  ADD COLUMN speed                int     not null default 30,
  ADD COLUMN cr                   text    not null default '0',
  ADD COLUMN xp                   int     not null default 0,
  ADD COLUMN str_score            int     not null default 10,
  ADD COLUMN dex_score            int     not null default 10,
  ADD COLUMN con_score            int     not null default 10,
  ADD COLUMN int_score            int     not null default 10,
  ADD COLUMN wis_score            int     not null default 10,
  ADD COLUMN cha_score            int     not null default 10,
  ADD COLUMN actions              jsonb   not null default '[]',
  ADD COLUMN special_abilities    jsonb   not null default '[]',
  ADD COLUMN legendary_actions    jsonb   not null default '[]',
  ADD COLUMN damage_resistances   text[]  not null default '{}',
  ADD COLUMN damage_immunities    text[]  not null default '{}',
  ADD COLUMN condition_immunities text[]  not null default '{}',
  ADD COLUMN senses               text,
  ADD COLUMN languages            text;

-- ── Extend encounter_participants with per-participant ability scores and actions ──────
ALTER TABLE public.encounter_participants
  ADD COLUMN str_score         int,
  ADD COLUMN dex_score         int,
  ADD COLUMN con_score         int,
  ADD COLUMN int_score         int,
  ADD COLUMN wis_score         int,
  ADD COLUMN cha_score         int,
  ADD COLUMN actions           jsonb,
  ADD COLUMN special_abilities jsonb;

-- ── Monster portrait storage bucket ──────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'monster-portraits',
  'monster-portraits',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "monster-portraits: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'monster-portraits');

CREATE POLICY "monster-portraits: auth insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'monster-portraits'
    AND auth.uid()::text = (string_to_array(name, '/'))[1]
  );

CREATE POLICY "monster-portraits: auth update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'monster-portraits'
    AND auth.uid()::text = (string_to_array(name, '/'))[1]
  );

CREATE POLICY "monster-portraits: auth delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'monster-portraits'
    AND auth.uid()::text = (string_to_array(name, '/'))[1]
  );
