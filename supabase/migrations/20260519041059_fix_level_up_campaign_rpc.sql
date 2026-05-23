CREATE OR REPLACE FUNCTION public.level_up_campaign(campaign_id uuid)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
begin
  if not exists (
    select 1 from public.campaign_members
    where campaign_members.campaign_id = level_up_campaign.campaign_id
      and user_id = auth.uid() and role = 'dm'
  ) then
    raise exception 'Only the Dungeon Master can level up the campaign';
  end if;

  -- Mark all active characters as pending level-up without touching their level.
  -- Each player completes the wizard on their own character sheet, which
  -- increments the level and applies all stat changes atomically.
  update public.characters
  set level_up_pending = true,
      updated_at = now()
  where characters.campaign_id = level_up_campaign.campaign_id
    and status = 'active'
    and level < 20;
end;
$$;
