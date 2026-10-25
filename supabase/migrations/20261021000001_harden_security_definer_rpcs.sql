-- ─────────────────────────────────────────────────────────────────────────────
-- Harden the SECURITY DEFINER RPCs.
--
-- All three functions below are SECURITY DEFINER (they bypass RLS by design)
-- but carried NO authorization check of their own, and Postgres grants EXECUTE
-- to PUBLIC by default — so every one of them was callable by `anon`.
--
-- That matters here because the anon key is deliberately baked into the shipped
-- desktop/Android bundle and into the GitHub release artifacts. "Callable by
-- anon" therefore means "callable by anyone on the internet".
--
-- Fixes, in order of severity:
--
--  1. find_user_id_by_email  — was an UNAUTHENTICATED email -> account oracle:
--     `select id from auth.users where lower(email) = lower($1)`, no guard.
--     Anyone could confirm whether an email had an account and learn its uuid.
--     Now: authenticated DMs/admins only, enforced inside the function body so
--     the privilege cannot be bypassed by a direct REST call.
--
--  2. advance_encounter_turn — any caller could advance any encounter's turn by
--     uuid. The UI hides the button for players, which is not a control.
--     Now: DM of that encounter's campaign only.
--     (Safe: the BEFORE DELETE trigger fn_advance_turn_on_participant_delete
--      inlines its own advance logic and does not call this function.)
--
--  3. reorder_initiative — any caller could rewrite initiative_order for any
--     encounter. Players legitimately call this from InitiativeRollScreen after
--     rolling, so this one is scoped to campaign MEMBERS rather than DMs.
--
-- The is_app_admin / is_campaign_dm / is_campaign_member helpers are left
-- callable: they return booleans derived from auth.uid() (null -> false for
-- anon, so they disclose nothing), and they are invoked from inside RLS
-- policies, where revoking EXECUTE from a role would break that role's reads.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. find_user_id_by_email ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.find_user_id_by_email(target_email text)
  RETURNS uuid
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public
AS $function$
  SELECT u.id
  FROM auth.users u
  WHERE lower(u.email) = lower(target_email)
    AND (
      public.is_app_admin()
      OR EXISTS (
        SELECT 1 FROM public.campaign_members cm
        WHERE cm.user_id = auth.uid()
          AND cm.role = 'dm'
      )
    )
  LIMIT 1;
$function$;

REVOKE ALL ON FUNCTION public.find_user_id_by_email(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.find_user_id_by_email(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.find_user_id_by_email(text) TO authenticated;

-- ── 2. advance_encounter_turn ────────────────────────────────────────────────
-- Body is unchanged from 20260526071204 apart from the authorization gate.
CREATE OR REPLACE FUNCTION public.advance_encounter_turn(p_encounter_id uuid)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $function$
DECLARE
  v_current_order int;
  v_next_id       uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.encounters e
    WHERE e.id = p_encounter_id
      AND public.is_campaign_dm(e.campaign_id)
  ) THEN
    RAISE EXCEPTION 'advance_encounter_turn: only the campaign DM may advance the turn'
      USING ERRCODE = '42501';
  END IF;

  SELECT ep.initiative_order INTO v_current_order
  FROM public.encounters e
  LEFT JOIN public.encounter_participants ep ON ep.id = e.current_participant_id
  WHERE e.id = p_encounter_id;

  IF v_current_order IS NULL THEN
    SELECT id INTO v_next_id
    FROM public.encounter_participants
    WHERE encounter_id = p_encounter_id
    ORDER BY initiative_order ASC
    LIMIT 1;
  ELSE
    SELECT id INTO v_next_id
    FROM public.encounter_participants
    WHERE encounter_id = p_encounter_id
      AND initiative_order > v_current_order
    ORDER BY initiative_order ASC
    LIMIT 1;

    IF v_next_id IS NULL THEN
      SELECT id INTO v_next_id
      FROM public.encounter_participants
      WHERE encounter_id = p_encounter_id
      ORDER BY initiative_order ASC
      LIMIT 1;
    END IF;
  END IF;

  IF v_next_id IS NOT NULL THEN
    UPDATE public.encounter_participants
       SET action_used   = false,
           bonus_used    = false,
           reaction_used = false,
           dodging       = false
     WHERE id = v_next_id;
  END IF;

  UPDATE public.encounters SET current_participant_id = v_next_id WHERE id = p_encounter_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.advance_encounter_turn(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.advance_encounter_turn(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.advance_encounter_turn(uuid) TO authenticated;

-- ── 3. reorder_initiative ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.reorder_initiative(p_encounter_id uuid)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.encounters e
    WHERE e.id = p_encounter_id
      AND public.is_campaign_member(e.campaign_id)
  ) THEN
    RAISE EXCEPTION 'reorder_initiative: caller is not a member of this campaign'
      USING ERRCODE = '42501';
  END IF;

  WITH ranked AS (
    SELECT id,
           ROW_NUMBER() OVER (
             ORDER BY initiative_score DESC, dex_score DESC NULLS LAST, random()
           ) AS new_order
    FROM public.encounter_participants
    WHERE encounter_id = p_encounter_id
  )
  UPDATE public.encounter_participants ep
  SET initiative_order = r.new_order
  FROM ranked r
  WHERE ep.id = r.id;
END;
$function$;

REVOKE ALL ON FUNCTION public.reorder_initiative(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reorder_initiative(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.reorder_initiative(uuid) TO authenticated;
