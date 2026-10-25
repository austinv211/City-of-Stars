-- ─────────────────────────────────────────────────────────────────────────────
-- Let app admins read every campaign.
--
-- The admin page at /admin/campaigns ("All Campaigns", subtitle "Add yourself
-- with one or more roles per campaign") exists so an admin can join a campaign
-- they are not yet a member of. It could never do that: the only SELECT policy
-- on public.campaigns is
--
--   created_by = auth.uid()
--   OR EXISTS (select 1 from campaign_members
--              where campaign_id = campaigns.id and user_id = auth.uid())
--
-- with no admin clause, so the page listed zero campaigns for any admin who
-- was not already a member — exactly the case it was built for.
--
-- Verified against a local stack seeded with one campaign:
--   admin@test.local -> 0 campaigns
--   dm@test.local    -> 1 campaign
--
-- NOTE: this WIDENS read access. It is a deliberate grant to the `admin` app
-- role, which is already trusted elsewhere (is_app_admin() gates writes to all
-- srd_* tables and the email whitelist). It does not change what any player or
-- DM can see.
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "campaigns: members read" ON public.campaigns;

CREATE POLICY "campaigns: members read"
  ON public.campaigns FOR SELECT
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.campaign_members
      WHERE campaign_members.campaign_id = campaigns.id
        AND campaign_members.user_id = auth.uid()
    )
    OR public.is_app_admin()
  );
