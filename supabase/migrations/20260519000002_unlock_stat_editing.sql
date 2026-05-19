-- Allow full stat editing without the is_locked restriction,
-- and grant DMs write access to character stats.

-- ── ability_scores ───────────────────────────────────────────────────────────

drop policy "ability_scores: owner write (unlocked only)" on public.ability_scores;

create policy "ability_scores: owner write"
  on public.ability_scores for all
  using (
    exists (select 1 from public.characters
            where id = ability_scores.character_id and owner_id = auth.uid())
  )
  with check (
    exists (select 1 from public.characters
            where id = ability_scores.character_id and owner_id = auth.uid())
  );

create policy "ability_scores: dm write"
  on public.ability_scores for all
  using (
    exists (
      select 1 from public.characters c
      join public.campaign_members cm on cm.campaign_id = c.campaign_id
      where c.id = ability_scores.character_id
        and cm.user_id = auth.uid()
        and cm.role = 'dm'
    )
  )
  with check (
    exists (
      select 1 from public.characters c
      join public.campaign_members cm on cm.campaign_id = c.campaign_id
      where c.id = ability_scores.character_id
        and cm.user_id = auth.uid()
        and cm.role = 'dm'
    )
  );

-- ── characters ───────────────────────────────────────────────────────────────
-- DMs need write access to update HP, AC, speed, level etc. on any character
-- in their campaign.

create policy "characters: dm write"
  on public.characters for all
  using (
    exists (
      select 1 from public.campaign_members
      where campaign_id = characters.campaign_id
        and user_id = auth.uid()
        and role = 'dm'
    )
  )
  with check (
    exists (
      select 1 from public.campaign_members
      where campaign_id = characters.campaign_id
        and user_id = auth.uid()
        and role = 'dm'
    )
  );
