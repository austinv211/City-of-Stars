-- Allow DMs to write character_inventory, character_attacks, and character_spells
-- for any character in their campaign (matching the existing dm write pattern on
-- characters, ability_scores, and character_proficiencies).

create policy "character_inventory: dm write"
  on public.character_inventory for all
  using (
    exists (
      select 1 from public.characters c
      join public.campaign_members cm on cm.campaign_id = c.campaign_id
      where c.id = character_inventory.character_id
        and cm.user_id = auth.uid() and cm.role = 'dm'
    )
  )
  with check (
    exists (
      select 1 from public.characters c
      join public.campaign_members cm on cm.campaign_id = c.campaign_id
      where c.id = character_inventory.character_id
        and cm.user_id = auth.uid() and cm.role = 'dm'
    )
  );

create policy "character_attacks: dm write"
  on public.character_attacks for all
  using (
    exists (
      select 1 from public.characters c
      join public.campaign_members cm on cm.campaign_id = c.campaign_id
      where c.id = character_attacks.character_id
        and cm.user_id = auth.uid() and cm.role = 'dm'
    )
  )
  with check (
    exists (
      select 1 from public.characters c
      join public.campaign_members cm on cm.campaign_id = c.campaign_id
      where c.id = character_attacks.character_id
        and cm.user_id = auth.uid() and cm.role = 'dm'
    )
  );

create policy "character_spells: dm write"
  on public.character_spells for all
  using (
    exists (
      select 1 from public.characters c
      join public.campaign_members cm on cm.campaign_id = c.campaign_id
      where c.id = character_spells.character_id
        and cm.user_id = auth.uid() and cm.role = 'dm'
    )
  )
  with check (
    exists (
      select 1 from public.characters c
      join public.campaign_members cm on cm.campaign_id = c.campaign_id
      where c.id = character_spells.character_id
        and cm.user_id = auth.uid() and cm.role = 'dm'
    )
  );
