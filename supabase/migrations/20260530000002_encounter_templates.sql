-- Encounter templates
--
-- A template is a reusable encounter definition (name + NPC participants) that a
-- DM can "run" repeatedly. Templates never go active themselves; running one
-- clones it into a fresh encounter (status pending -> active) so each run gets
-- its own history row. Implemented as a flag on the existing encounters table so
-- all NPC/statblock storage (encounter_participants) and RLS policies are reused.

alter table public.encounters
  add column if not exists is_template boolean not null default false;

-- Templates are excluded from the "active/pending run" queries; index the common
-- per-campaign template lookup.
create index if not exists encounters_templates_idx
  on public.encounters (campaign_id)
  where is_template;
