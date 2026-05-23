-- campaign_members: needed for the user-memberships subscription in CampaignContext
-- so players see new/removed campaigns without a page refresh.
-- REPLICA IDENTITY FULL lets the user_id column appear in the WAL for DELETE events
-- (default identity only logs the primary key, so the user_id filter never matches deletions).
ALTER TABLE public.campaign_members REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.campaign_members;

-- campaigns: needed for campaign-update and campaign-deletions subscriptions in CampaignContext.
ALTER PUBLICATION supabase_realtime ADD TABLE public.campaigns;
