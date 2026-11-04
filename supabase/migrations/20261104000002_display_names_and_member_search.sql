-- ─────────────────────────────────────────────────────────────────────────────
-- Display names, player search, and keeping emails between the DM and admin.
--
-- Before this, a DM added a player by typing their exact email, and every
-- campaign member could read every other member's email through
-- get_campaign_members_with_email. Display names lived only in the auth
-- user's metadata (the Account dialog writes there); public.profiles got a
-- copy at sign-up and was never updated again.
--
-- After it:
--   * profiles.display_name is kept in step with the metadata by a trigger on
--     auth.users, so existing installs that still write the metadata keep
--     working and nothing needs to change on their side.
--   * get_campaign_roster returns names to every member and emails only to
--     the campaign's DMs and app admins.
--   * search_campaign_candidates lets a DM find people by name (or email)
--     instead of typing an exact address, including invitees who have not
--     signed up yet.
--   * campaign_invites holds "add this email when they sign up"; the sign-up
--     trigger turns an invite into a membership.
--
-- Everything is additive. get_campaign_members_with_email keeps its
-- signature for v0.7.0 and older installs; only non-DM callers now get null
-- emails, and no older client shows that function's result to a player.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Backfill profiles from the auth metadata ─────────────────────────────
-- One user predates the profile trigger and has no row; every row's name is
-- stale because the Account dialog never wrote here.
INSERT INTO public.profiles (id, display_name)
SELECT u.id, nullif(btrim(u.raw_user_meta_data ->> 'display_name'), '')
FROM auth.users u
ON CONFLICT (id) DO UPDATE
  SET display_name = coalesce(excluded.display_name, public.profiles.display_name);

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_display_name_length;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_display_name_length
  CHECK (display_name IS NULL OR length(display_name) BETWEEN 1 AND 40);

-- ── 2. Keep profiles in step with the metadata ──────────────────────────────
CREATE OR REPLACE FUNCTION public.sync_profile_display_name()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name text := left(nullif(btrim(NEW.raw_user_meta_data ->> 'display_name'), ''), 40);
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, v_name)
  ON CONFLICT (id) DO UPDATE SET display_name = excluded.display_name;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_metadata_updated ON auth.users;
CREATE TRIGGER on_auth_user_metadata_updated
  AFTER UPDATE OF raw_user_meta_data ON auth.users
  FOR EACH ROW
  WHEN (OLD.raw_user_meta_data ->> 'display_name'
        IS DISTINCT FROM NEW.raw_user_meta_data ->> 'display_name')
  EXECUTE FUNCTION public.sync_profile_display_name();

REVOKE ALL ON FUNCTION public.sync_profile_display_name() FROM PUBLIC, anon, authenticated;

-- ── 3. Pending invites ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.campaign_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  email text NOT NULL CHECK (email = lower(btrim(email)) AND length(email) > 3),
  role text NOT NULL DEFAULT 'player' CHECK (role IN ('dm', 'player')),
  invited_by uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, email, role)
);

ALTER TABLE public.campaign_invites ENABLE ROW LEVEL SECURITY;

-- Emails, so DM and admin only. One policy per action (see 20261025000003).
DROP POLICY IF EXISTS "campaign_invites: dm read" ON public.campaign_invites;
CREATE POLICY "campaign_invites: dm read" ON public.campaign_invites
  FOR SELECT TO authenticated
  USING (public.is_campaign_dm(campaign_id) OR public.is_app_admin());

DROP POLICY IF EXISTS "campaign_invites: dm insert" ON public.campaign_invites;
CREATE POLICY "campaign_invites: dm insert" ON public.campaign_invites
  FOR INSERT TO authenticated
  WITH CHECK (public.is_campaign_dm(campaign_id) OR public.is_app_admin());

DROP POLICY IF EXISTS "campaign_invites: dm delete" ON public.campaign_invites;
CREATE POLICY "campaign_invites: dm delete" ON public.campaign_invites
  FOR DELETE TO authenticated
  USING (public.is_campaign_dm(campaign_id) OR public.is_app_admin());

GRANT SELECT, INSERT, DELETE ON public.campaign_invites TO authenticated;

-- ── 4. Sign-up: profile, app role, and any pending invites ──────────────────
-- Unchanged apart from the invite step and trimming the name.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _role public.app_role;
BEGIN
  SELECT app_role INTO _role
  FROM public.allowed_emails
  WHERE lower(email) = lower(new.email)
  LIMIT 1;

  INSERT INTO public.profiles (id, display_name)
  VALUES (new.id, left(nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''), 40))
  ON CONFLICT (id) DO NOTHING;

  IF _role IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, app_role)
    VALUES (new.id, _role)
    ON CONFLICT DO NOTHING;
  END IF;

  INSERT INTO public.campaign_members (campaign_id, user_id, role)
  SELECT i.campaign_id, new.id, i.role
  FROM public.campaign_invites i
  WHERE i.email = lower(new.email)
  ON CONFLICT DO NOTHING;

  DELETE FROM public.campaign_invites WHERE email = lower(new.email);

  RETURN new;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- ── 5. Roster: names for everyone, emails for the DM ────────────────────────
CREATE OR REPLACE FUNCTION public.get_campaign_roster(cid uuid)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  display_name text,
  email text,
  role text,
  joined_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cm.id,
         cm.user_id,
         coalesce(p.display_name, split_part(u.email, '@', 1)) AS display_name,
         CASE WHEN public.is_campaign_dm(cid) OR public.is_app_admin()
              THEN u.email::text END AS email,
         cm.role,
         cm.joined_at
  FROM public.campaign_members cm
  JOIN auth.users u ON u.id = cm.user_id
  LEFT JOIN public.profiles p ON p.id = cm.user_id
  WHERE cm.campaign_id = cid
    AND (public.is_campaign_member(cid) OR public.is_app_admin())
  ORDER BY cm.joined_at;
$$;

REVOKE ALL ON FUNCTION public.get_campaign_roster(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_campaign_roster(uuid) TO authenticated;

-- Older installs call this one. Same shape; emails now only for the DM.
CREATE OR REPLACE FUNCTION public.get_campaign_members_with_email(cid uuid)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  email text,
  role text,
  joined_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.id, r.user_id, r.email, r.role, r.joined_at
  FROM public.get_campaign_roster(cid) r;
$$;

REVOKE ALL ON FUNCTION public.get_campaign_members_with_email(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_campaign_members_with_email(uuid) TO authenticated;

-- ── 6. Search for people to add ─────────────────────────────────────────────
-- Everyone on the whitelist, signed up or not, matched on name or email.
-- `member_roles` lists the roles they already hold in this campaign and
-- `invited_roles` the ones waiting for them to sign up, so the UI can say
-- "already a player" instead of failing on insert.
CREATE OR REPLACE FUNCTION public.search_campaign_candidates(cid uuid, q text DEFAULT '')
RETURNS TABLE (
  user_id uuid,
  display_name text,
  email text,
  member_roles text[],
  invited_roles text[]
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_q text := '%' || lower(btrim(coalesce(q, ''))) || '%';
BEGIN
  IF NOT (public.is_campaign_dm(cid) OR public.is_app_admin()) THEN
    RAISE EXCEPTION 'search_campaign_candidates: only the campaign DM may search'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH people AS (
    SELECT DISTINCT lower(a.email) AS email FROM public.allowed_emails a
    UNION
    SELECT lower(u.email) FROM auth.users u
    JOIN public.campaign_members cm ON cm.user_id = u.id AND cm.campaign_id = cid
  )
  SELECT u.id,
         coalesce(p.display_name, split_part(people.email, '@', 1)),
         people.email,
         coalesce((SELECT array_agg(cm.role ORDER BY cm.role)
                   FROM public.campaign_members cm
                   WHERE cm.campaign_id = cid AND cm.user_id = u.id), '{}'),
         coalesce((SELECT array_agg(i.role ORDER BY i.role)
                   FROM public.campaign_invites i
                   WHERE i.campaign_id = cid AND i.email = people.email), '{}')
  FROM people
  LEFT JOIN auth.users u ON lower(u.email) = people.email
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE lower(coalesce(p.display_name, '')) LIKE v_q
     OR people.email LIKE v_q
  ORDER BY u.id IS NULL, lower(coalesce(p.display_name, people.email))
  LIMIT 50;
END;
$$;

REVOKE ALL ON FUNCTION public.search_campaign_candidates(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_campaign_candidates(uuid, text) TO authenticated;

-- ── 7. Whitelist status for the admin page ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_whitelist_signups()
RETURNS TABLE (email text, display_name text, signed_up_at timestamptz)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_app_admin() THEN
    RAISE EXCEPTION 'get_whitelist_signups: admins only' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT lower(u.email)::text, p.display_name, u.created_at
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE lower(u.email) IN (SELECT lower(a.email) FROM public.allowed_emails a);
END;
$$;

REVOKE ALL ON FUNCTION public.get_whitelist_signups() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_whitelist_signups() TO authenticated;
