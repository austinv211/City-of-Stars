
CREATE INDEX IF NOT EXISTS encounters_campaign_id_idx ON public.encounters (campaign_id);
CREATE INDEX IF NOT EXISTS encounter_participants_encounter_id_idx ON public.encounter_participants (encounter_id);
