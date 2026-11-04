-- ─────────────────────────────────────────────────────────────────────────────
-- Pictures and GIFs in campaign notes.
--
-- One public bucket, foldered by campaign: <campaign_id>/<random>.<ext>.
-- Public because note images render through a plain <img> (signed URLs
-- would expire inside saved notes); the object names are random UUIDs.
-- There is deliberately no SELECT policy: public URLs are served without one,
-- and adding one would let anyone list every file in the bucket.
-- Writes are limited to members of the campaign the folder names, and
-- deletes to its DM or the uploader.
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'campaign-media',
  'campaign-media',
  true,
  10485760, -- 10 MB: GIFs are large
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE
  SET public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- The folder name is user input; a non-uuid must fail the policy, not error.
CREATE OR REPLACE FUNCTION public.campaign_from_media_path(p_name text)
RETURNS uuid
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  RETURN split_part(p_name, '/', 1)::uuid;
EXCEPTION WHEN invalid_text_representation THEN
  RETURN NULL;
END;
$$;

DROP POLICY IF EXISTS "campaign-media: members upload" ON storage.objects;
CREATE POLICY "campaign-media: members upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'campaign-media'
    AND public.is_campaign_member(public.campaign_from_media_path(name))
  );

DROP POLICY IF EXISTS "campaign-media: dm or uploader delete" ON storage.objects;
CREATE POLICY "campaign-media: dm or uploader delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'campaign-media'
    AND (
      owner_id = (SELECT auth.uid())::text
      OR public.is_campaign_dm(public.campaign_from_media_path(name))
    )
  );
