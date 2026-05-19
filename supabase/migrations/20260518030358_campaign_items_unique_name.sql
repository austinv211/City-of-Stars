ALTER TABLE public.campaign_items
  ADD CONSTRAINT campaign_items_campaign_name_unique UNIQUE (campaign_id, item_name);
