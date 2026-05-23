
-- Add missing tables to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE party_stats;
ALTER PUBLICATION supabase_realtime ADD TABLE character_campaign_stats;
ALTER PUBLICATION supabase_realtime ADD TABLE character_spell_slots;

-- character_campaign_stats needs a standalone campaign_id index for realtime filter
CREATE INDEX IF NOT EXISTS character_campaign_stats_campaign_id_idx
  ON public.character_campaign_stats (campaign_id);
