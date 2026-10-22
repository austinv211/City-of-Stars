-- ─────────────────────────────────────────────────────────────────────────────
-- Follow-up to 20261021000001, driven by the Supabase security advisors.
--
-- Two classes of finding remain after the previous migration. Both are fixed
-- here. A third is documented as an accepted tradeoff rather than "fixed".
--
-- ── 1. Trigger functions exposed as REST RPC endpoints ──────────────────────
-- handle_new_user, add_campaign_creator_as_dm, prevent_locked_character_edits
-- and sync_character_to_participants are trigger functions, but they inherit
-- the default PUBLIC EXECUTE grant, so PostgREST publishes each of them at
-- /rest/v1/rpc/<name>. Calling a trigger function outside a trigger context
-- errors out, so the practical risk is low -- but they are not API and should
-- not be reachable as API.
--
-- Revoking EXECUTE does NOT disable the triggers: a trigger function is
-- invoked by the trigger mechanism as the table owner, and is not subject to
-- the calling user's EXECUTE privilege. The triggers keep working.
--
-- ── 2. SECURITY DEFINER functions with a mutable search_path ────────────────
-- A SECURITY DEFINER function without a pinned search_path can be hijacked by
-- a caller who puts a same-named object earlier on their own search_path --
-- the classic Postgres privilege-escalation vector. Every other definer
-- function in this schema already pins it; these two were missed.
--
-- ── 3. ACCEPTED, NOT FIXED: is_email_allowed(text) ──────────────────────────
-- It is SECURITY DEFINER, unguarded, and callable by `anon`, so it discloses
-- whether a given email is on the invite whitelist.
--
-- This is deliberate and load-bearing: LoginPage.tsx:51 calls it *before*
-- touching auth so signup can say "this email is not authorized" instead of
-- failing opaquely. Revoking it from `anon` breaks that flow.
--
-- It is also a much smaller leak than the find_user_id_by_email oracle closed
-- in the previous migration: that returned a real auth.users UUID for any
-- address, whereas this returns a boolean about an invite list.
--
-- If we ever want it closed, the fix is a product change rather than a grant
-- change: let signUp() proceed, reject non-whitelisted emails in a trigger on
-- auth.users, and show a generic failure message. Logged here so the decision
-- is traceable rather than rediscovered.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Un-publish the trigger functions ──────────────────────────────────────
REVOKE ALL ON FUNCTION public.handle_new_user()                   FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.add_campaign_creator_as_dm()        FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prevent_locked_character_edits()    FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_character_to_participants()    FROM PUBLIC, anon, authenticated;

-- ── 2. Pin search_path on the two definer functions still missing it ─────────
ALTER FUNCTION public.get_campaign_members_with_email(uuid)      SET search_path = public;
ALTER FUNCTION public.fn_advance_turn_on_participant_delete()    SET search_path = public;

-- fn_advance_turn_on_participant_delete is also a trigger function, so it gets
-- the same treatment as the group above.
REVOKE ALL ON FUNCTION public.fn_advance_turn_on_participant_delete() FROM PUBLIC, anon, authenticated;
