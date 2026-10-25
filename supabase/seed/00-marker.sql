-- ─────────────────────────────────────────────────────────────────────────────
-- TEST-DATABASE TRIPWIRE
--
-- This table exists ONLY in a database that was created by `supabase db reset`
-- against a local or ephemeral stack. Production has never run this seed and
-- never will, because seeds run on `db reset` — not on `db push`.
--
-- Every destructive test helper asserts this table exists before touching
-- anything. That makes "am I pointed at production?" answerable by the database
-- itself, rather than by trusting an environment variable.
--
-- See scripts/assert-not-production.mjs and the plan's §2.1.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public._cos_test_marker (
  id          int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  seeded_at   timestamptz NOT NULL DEFAULT now(),
  note        text NOT NULL DEFAULT 'Local/ephemeral test database. NOT production.'
);

INSERT INTO public._cos_test_marker (id) VALUES (1)
  ON CONFLICT (id) DO UPDATE SET seeded_at = now();

-- Readable by anyone so a client can cheaply self-check which DB it is on;
-- writable by no one through the API.
ALTER TABLE public._cos_test_marker ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "_cos_test_marker: anyone read" ON public._cos_test_marker;
CREATE POLICY "_cos_test_marker: anyone read"
  ON public._cos_test_marker FOR SELECT
  USING (true);
