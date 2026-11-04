-- ─────────────────────────────────────────────────────────────────────────────
-- Session scheduling.
--
--   session_availability   each member marks days as good / maybe / can't.
--                          The whole table sees everyone's marks, which is
--                          the point: it is how the group finds a day.
--   scheduled_sessions     the DM's decision: when the next session starts.
--                          starts_at is a timestamptz, so every player sees it
--                          in their own time zone.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.session_availability (
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  day date NOT NULL,
  status text NOT NULL CHECK (status IN ('yes', 'maybe', 'no')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (campaign_id, user_id, day)
);

CREATE INDEX IF NOT EXISTS session_availability_campaign_day_idx
  ON public.session_availability (campaign_id, day);
CREATE INDEX IF NOT EXISTS session_availability_user_idx
  ON public.session_availability (user_id);

CREATE TABLE IF NOT EXISTS public.scheduled_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  starts_at timestamptz NOT NULL,
  -- Where: a table, an address, a voice channel.
  location text CHECK (location IS NULL OR length(location) <= 200),
  note text CHECK (note IS NULL OR length(note) <= 2000),
  created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS scheduled_sessions_campaign_idx
  ON public.scheduled_sessions (campaign_id, starts_at);
CREATE INDEX IF NOT EXISTS scheduled_sessions_created_by_idx
  ON public.scheduled_sessions (created_by);

-- ── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.session_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "session_availability: members read" ON public.session_availability;
CREATE POLICY "session_availability: members read" ON public.session_availability
  FOR SELECT TO authenticated USING (public.is_campaign_member(campaign_id));

DROP POLICY IF EXISTS "session_availability: own insert" ON public.session_availability;
CREATE POLICY "session_availability: own insert" ON public.session_availability
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()) AND public.is_campaign_member(campaign_id));

DROP POLICY IF EXISTS "session_availability: own update" ON public.session_availability;
CREATE POLICY "session_availability: own update" ON public.session_availability
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()) AND public.is_campaign_member(campaign_id));

DROP POLICY IF EXISTS "session_availability: own delete" ON public.session_availability;
CREATE POLICY "session_availability: own delete" ON public.session_availability
  FOR DELETE TO authenticated USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "scheduled_sessions: members read" ON public.scheduled_sessions;
CREATE POLICY "scheduled_sessions: members read" ON public.scheduled_sessions
  FOR SELECT TO authenticated USING (public.is_campaign_member(campaign_id));

DROP POLICY IF EXISTS "scheduled_sessions: dm insert" ON public.scheduled_sessions;
CREATE POLICY "scheduled_sessions: dm insert" ON public.scheduled_sessions
  FOR INSERT TO authenticated WITH CHECK (public.is_campaign_dm(campaign_id));

DROP POLICY IF EXISTS "scheduled_sessions: dm update" ON public.scheduled_sessions;
CREATE POLICY "scheduled_sessions: dm update" ON public.scheduled_sessions
  FOR UPDATE TO authenticated
  USING (public.is_campaign_dm(campaign_id)) WITH CHECK (public.is_campaign_dm(campaign_id));

DROP POLICY IF EXISTS "scheduled_sessions: dm delete" ON public.scheduled_sessions;
CREATE POLICY "scheduled_sessions: dm delete" ON public.scheduled_sessions
  FOR DELETE TO authenticated USING (public.is_campaign_dm(campaign_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_availability TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scheduled_sessions TO authenticated;

-- ── Realtime ────────────────────────────────────────────────────────────────
ALTER TABLE public.session_availability REPLICA IDENTITY FULL;
ALTER TABLE public.scheduled_sessions REPLICA IDENTITY FULL;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['session_availability', 'scheduled_sessions'] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;
