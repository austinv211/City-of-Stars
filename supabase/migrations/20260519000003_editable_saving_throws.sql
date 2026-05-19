-- Add per-character saving throw proficiencies (so DMs can freely override class defaults).
-- Populate from class defaults for existing rows.

alter table public.characters
  add column if not exists saving_throw_proficiencies text[] not null default '{}';

update public.characters set saving_throw_proficiencies = case class
  when 'Barbarian' then array['strength', 'constitution']
  when 'Bard'      then array['dexterity', 'charisma']
  when 'Cleric'    then array['wisdom', 'charisma']
  when 'Druid'     then array['intelligence', 'wisdom']
  when 'Fighter'   then array['strength', 'constitution']
  when 'Monk'      then array['strength', 'dexterity']
  when 'Paladin'   then array['wisdom', 'charisma']
  when 'Ranger'    then array['strength', 'dexterity']
  when 'Rogue'     then array['dexterity', 'intelligence']
  when 'Sorcerer'  then array['constitution', 'charisma']
  when 'Warlock'   then array['wisdom', 'charisma']
  when 'Wizard'    then array['intelligence', 'wisdom']
  else array[]::text[]
end;

-- DMs need write access to skill/saving-throw proficiencies for characters in their campaign.

create policy "character_proficiencies: dm write"
  on public.character_proficiencies for all
  using (
    exists (
      select 1 from public.characters c
      join public.campaign_members cm on cm.campaign_id = c.campaign_id
      where c.id = character_proficiencies.character_id
        and cm.user_id = auth.uid()
        and cm.role = 'dm'
    )
  )
  with check (
    exists (
      select 1 from public.characters c
      join public.campaign_members cm on cm.campaign_id = c.campaign_id
      where c.id = character_proficiencies.character_id
        and cm.user_id = auth.uid()
        and cm.role = 'dm'
    )
  );
