-- ── Extensions ───────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ════════════════════════════════════════════════════════════════════════════
-- TABLES (all FK dependencies resolved top-to-bottom)
-- ════════════════════════════════════════════════════════════════════════════

-- ── profiles ─────────────────────────────────────────────────────────────────
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text,
  created_at    timestamptz not null default now()
);

-- ── campaigns ────────────────────────────────────────────────────────────────
create table public.campaigns (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  description text,
  created_by  uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now()
);

-- ── campaign_members ─────────────────────────────────────────────────────────
create table public.campaign_members (
  id           uuid primary key default uuid_generate_v4(),
  campaign_id  uuid not null references public.campaigns(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  role         text not null check (role in ('dm', 'player')),
  joined_at    timestamptz not null default now(),
  unique (campaign_id, user_id)
);

-- ── characters ───────────────────────────────────────────────────────────────
create table public.characters (
  id           uuid primary key default uuid_generate_v4(),
  campaign_id  uuid not null references public.campaigns(id) on delete cascade,
  owner_id     uuid not null references auth.users(id) on delete cascade,
  name         text not null,
  species      text not null,
  class        text not null,
  subclass     text,
  background   text not null,
  level        int  not null default 1 check (level between 1 and 20),
  portrait_url text,
  status       text not null default 'draft' check (status in ('draft', 'active', 'backup')),
  is_locked    boolean not null default false,
  backstory    text,
  alignment    text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create unique index characters_one_active_per_player
  on public.characters (campaign_id, owner_id)
  where status = 'active';

-- ── ability_scores ───────────────────────────────────────────────────────────
create table public.ability_scores (
  id                         uuid primary key default uuid_generate_v4(),
  character_id               uuid not null unique references public.characters(id) on delete cascade,
  strength                   int not null default 10,
  dexterity                  int not null default 10,
  constitution               int not null default 10,
  intelligence               int not null default 10,
  wisdom                     int not null default 10,
  charisma                   int not null default 10,
  method                     text not null default 'standard_array'
                               check (method in ('point_buy', 'standard_array', 'rolled')),
  background_bonus_primary   text,
  background_bonus_secondary text
);

-- ── character_proficiencies ───────────────────────────────────────────────────
create table public.character_proficiencies (
  id           uuid primary key default uuid_generate_v4(),
  character_id uuid not null references public.characters(id) on delete cascade,
  skill        text not null,
  is_expertise boolean not null default false,
  source       text not null default 'class' check (source in ('class', 'background', 'feat')),
  unique (character_id, skill)
);

-- ── character_inventory ───────────────────────────────────────────────────────
create table public.character_inventory (
  id           uuid primary key default uuid_generate_v4(),
  character_id uuid not null references public.characters(id) on delete cascade,
  name         text not null,
  description  text,
  quantity     int not null default 1,
  weight       numeric(6,2),
  is_equipped  boolean not null default false,
  created_at   timestamptz not null default now()
);

-- ── encounters ────────────────────────────────────────────────────────────────
create table public.encounters (
  id           uuid primary key default uuid_generate_v4(),
  campaign_id  uuid not null references public.campaigns(id) on delete cascade,
  name         text not null default 'Encounter',
  status       text not null default 'pending' check (status in ('pending', 'active', 'completed')),
  created_by   uuid not null references auth.users(id),
  started_at   timestamptz,
  ended_at     timestamptz,
  created_at   timestamptz not null default now()
);

-- ── encounter_participants ────────────────────────────────────────────────────
create table public.encounter_participants (
  id               uuid primary key default uuid_generate_v4(),
  encounter_id     uuid not null references public.encounters(id) on delete cascade,
  character_id     uuid references public.characters(id) on delete set null,
  name             text not null,
  portrait_url     text,
  initiative_order int not null default 0,
  initiative_score int not null default 0,
  hp_current       int not null default 0,
  hp_max           int not null default 0,
  hp_temp          int not null default 0,
  ac               int not null default 10,
  conditions       text[] not null default '{}',
  is_player        boolean not null default true,
  owner_id         uuid references auth.users(id) on delete set null
);

-- ── dice_rolls ────────────────────────────────────────────────────────────────
create table public.dice_rolls (
  id           uuid primary key default uuid_generate_v4(),
  campaign_id  uuid not null references public.campaigns(id) on delete cascade,
  encounter_id uuid references public.encounters(id) on delete set null,
  character_id uuid references public.characters(id) on delete set null,
  user_id      uuid not null references auth.users(id) on delete cascade,
  dice_type    text not null,
  roll_type    text not null,
  result       int not null,
  modifier     int not null default 0,
  total        int not null,
  rolled_at    timestamptz not null default now()
);

-- ── campaign_notes ────────────────────────────────────────────────────────────
create table public.campaign_notes (
  id               uuid primary key default uuid_generate_v4(),
  campaign_id      uuid not null unique references public.campaigns(id) on delete cascade,
  session_notes    text,
  campaign_details text,
  updated_at       timestamptz not null default now()
);

-- ── party_stats ───────────────────────────────────────────────────────────────
create table public.party_stats (
  id           uuid primary key default uuid_generate_v4(),
  campaign_id  uuid not null unique references public.campaigns(id) on delete cascade,
  stats        jsonb not null default '{}',
  updated_at   timestamptz not null default now()
);

-- ── character_campaign_stats ──────────────────────────────────────────────────
create table public.character_campaign_stats (
  id           uuid primary key default uuid_generate_v4(),
  character_id uuid not null references public.characters(id) on delete cascade,
  campaign_id  uuid not null references public.campaigns(id) on delete cascade,
  stats        jsonb not null default '{}',
  updated_at   timestamptz not null default now(),
  unique (character_id, campaign_id)
);

-- ════════════════════════════════════════════════════════════════════════════
-- RLS + GRANTS (all tables exist by this point)
-- ════════════════════════════════════════════════════════════════════════════

alter table public.profiles                enable row level security;
alter table public.campaigns               enable row level security;
alter table public.campaign_members        enable row level security;
alter table public.characters              enable row level security;
alter table public.ability_scores          enable row level security;
alter table public.character_proficiencies enable row level security;
alter table public.character_inventory     enable row level security;
alter table public.encounters              enable row level security;
alter table public.encounter_participants  enable row level security;
alter table public.dice_rolls              enable row level security;
alter table public.campaign_notes          enable row level security;
alter table public.party_stats             enable row level security;
alter table public.character_campaign_stats enable row level security;

grant select, insert, update            on public.profiles                  to authenticated;
grant select, insert, update            on public.campaigns                 to authenticated;
grant select, insert, update, delete    on public.campaign_members          to authenticated;
grant select, insert, update, delete    on public.characters                to authenticated;
grant select, insert, update, delete    on public.ability_scores            to authenticated;
grant select, insert, update, delete    on public.character_proficiencies   to authenticated;
grant select, insert, update, delete    on public.character_inventory       to authenticated;
grant select, insert, update, delete    on public.encounters                to authenticated;
grant select, insert, update, delete    on public.encounter_participants    to authenticated;
grant select, insert                    on public.dice_rolls                to authenticated;
grant select, insert, update            on public.campaign_notes            to authenticated;
grant select, insert, update            on public.party_stats               to authenticated;
grant select, insert, update            on public.character_campaign_stats  to authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- POLICIES
-- ════════════════════════════════════════════════════════════════════════════

-- profiles
create policy "profiles: owner read"
  on public.profiles for select using (auth.uid() = id);

create policy "profiles: owner write"
  on public.profiles for all
  using (auth.uid() = id) with check (auth.uid() = id);

-- campaigns
create policy "campaigns: members read"
  on public.campaigns for select
  using (
    exists (
      select 1 from public.campaign_members
      where campaign_id = campaigns.id and user_id = auth.uid()
    )
  );

create policy "campaigns: creator write"
  on public.campaigns for all
  using (created_by = auth.uid()) with check (created_by = auth.uid());

-- campaign_members
create policy "campaign_members: same campaign read"
  on public.campaign_members for select
  using (
    exists (
      select 1 from public.campaign_members cm2
      where cm2.campaign_id = campaign_members.campaign_id and cm2.user_id = auth.uid()
    )
  );

create policy "campaign_members: dm write"
  on public.campaign_members for all
  using (
    exists (
      select 1 from public.campaign_members cm
      where cm.campaign_id = campaign_members.campaign_id
        and cm.user_id = auth.uid() and cm.role = 'dm'
    )
  )
  with check (
    exists (
      select 1 from public.campaign_members cm
      where cm.campaign_id = campaign_members.campaign_id
        and cm.user_id = auth.uid() and cm.role = 'dm'
    )
  );

-- characters
create policy "characters: campaign members read"
  on public.characters for select
  using (
    exists (
      select 1 from public.campaign_members
      where campaign_id = characters.campaign_id and user_id = auth.uid()
    )
  );

create policy "characters: owner write"
  on public.characters for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- ability_scores
create policy "ability_scores: campaign members read"
  on public.ability_scores for select
  using (
    exists (
      select 1 from public.characters c
      join public.campaign_members cm on cm.campaign_id = c.campaign_id
      where c.id = ability_scores.character_id and cm.user_id = auth.uid()
    )
  );

create policy "ability_scores: owner write (unlocked only)"
  on public.ability_scores for all
  using (
    exists (select 1 from public.characters where id = ability_scores.character_id and owner_id = auth.uid())
  )
  with check (
    exists (select 1 from public.characters where id = ability_scores.character_id and owner_id = auth.uid() and not is_locked)
  );

-- character_proficiencies
create policy "character_proficiencies: campaign members read"
  on public.character_proficiencies for select
  using (
    exists (
      select 1 from public.characters c
      join public.campaign_members cm on cm.campaign_id = c.campaign_id
      where c.id = character_proficiencies.character_id and cm.user_id = auth.uid()
    )
  );

create policy "character_proficiencies: owner write"
  on public.character_proficiencies for all
  using (
    exists (select 1 from public.characters where id = character_proficiencies.character_id and owner_id = auth.uid())
  )
  with check (
    exists (select 1 from public.characters where id = character_proficiencies.character_id and owner_id = auth.uid())
  );

-- character_inventory
create policy "character_inventory: campaign members read"
  on public.character_inventory for select
  using (
    exists (
      select 1 from public.characters c
      join public.campaign_members cm on cm.campaign_id = c.campaign_id
      where c.id = character_inventory.character_id and cm.user_id = auth.uid()
    )
  );

create policy "character_inventory: owner write"
  on public.character_inventory for all
  using (
    exists (select 1 from public.characters where id = character_inventory.character_id and owner_id = auth.uid())
  )
  with check (
    exists (select 1 from public.characters where id = character_inventory.character_id and owner_id = auth.uid())
  );

-- encounters
create policy "encounters: campaign members read"
  on public.encounters for select
  using (
    exists (
      select 1 from public.campaign_members
      where campaign_id = encounters.campaign_id and user_id = auth.uid()
    )
  );

create policy "encounters: dm write"
  on public.encounters for all
  using (
    exists (
      select 1 from public.campaign_members
      where campaign_id = encounters.campaign_id and user_id = auth.uid() and role = 'dm'
    )
  )
  with check (
    exists (
      select 1 from public.campaign_members
      where campaign_id = encounters.campaign_id and user_id = auth.uid() and role = 'dm'
    )
  );

-- encounter_participants
create policy "encounter_participants: campaign members read"
  on public.encounter_participants for select
  using (
    exists (
      select 1 from public.encounters e
      join public.campaign_members cm on cm.campaign_id = e.campaign_id
      where e.id = encounter_participants.encounter_id and cm.user_id = auth.uid()
    )
  );

create policy "encounter_participants: owner update own"
  on public.encounter_participants for update
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "encounter_participants: dm write"
  on public.encounter_participants for all
  using (
    exists (
      select 1 from public.encounters e
      join public.campaign_members cm on cm.campaign_id = e.campaign_id
      where e.id = encounter_participants.encounter_id and cm.user_id = auth.uid() and cm.role = 'dm'
    )
  )
  with check (
    exists (
      select 1 from public.encounters e
      join public.campaign_members cm on cm.campaign_id = e.campaign_id
      where e.id = encounter_participants.encounter_id and cm.user_id = auth.uid() and cm.role = 'dm'
    )
  );

-- dice_rolls
create policy "dice_rolls: campaign members read"
  on public.dice_rolls for select
  using (
    exists (
      select 1 from public.campaign_members
      where campaign_id = dice_rolls.campaign_id and user_id = auth.uid()
    )
  );

create policy "dice_rolls: own insert"
  on public.dice_rolls for insert with check (user_id = auth.uid());

-- campaign_notes
create policy "campaign_notes: members read"
  on public.campaign_notes for select
  using (
    exists (
      select 1 from public.campaign_members
      where campaign_id = campaign_notes.campaign_id and user_id = auth.uid()
    )
  );

create policy "campaign_notes: dm write"
  on public.campaign_notes for all
  using (
    exists (
      select 1 from public.campaign_members
      where campaign_id = campaign_notes.campaign_id and user_id = auth.uid() and role = 'dm'
    )
  )
  with check (
    exists (
      select 1 from public.campaign_members
      where campaign_id = campaign_notes.campaign_id and user_id = auth.uid() and role = 'dm'
    )
  );

-- party_stats
create policy "party_stats: members read"
  on public.party_stats for select
  using (
    exists (
      select 1 from public.campaign_members
      where campaign_id = party_stats.campaign_id and user_id = auth.uid()
    )
  );

create policy "party_stats: dm write"
  on public.party_stats for all
  using (
    exists (
      select 1 from public.campaign_members
      where campaign_id = party_stats.campaign_id and user_id = auth.uid() and role = 'dm'
    )
  )
  with check (
    exists (
      select 1 from public.campaign_members
      where campaign_id = party_stats.campaign_id and user_id = auth.uid() and role = 'dm'
    )
  );

-- character_campaign_stats
create policy "character_campaign_stats: members read"
  on public.character_campaign_stats for select
  using (
    exists (
      select 1 from public.campaign_members
      where campaign_id = character_campaign_stats.campaign_id and user_id = auth.uid()
    )
  );

create policy "character_campaign_stats: owner or dm write"
  on public.character_campaign_stats for all
  using (
    exists (
      select 1 from public.characters c
      join public.campaign_members cm on cm.campaign_id = c.campaign_id
      where c.id = character_campaign_stats.character_id
        and cm.user_id = auth.uid()
        and (c.owner_id = auth.uid() or cm.role = 'dm')
    )
  )
  with check (
    exists (
      select 1 from public.characters c
      join public.campaign_members cm on cm.campaign_id = c.campaign_id
      where c.id = character_campaign_stats.character_id
        and cm.user_id = auth.uid()
        and (c.owner_id = auth.uid() or cm.role = 'dm')
    )
  );

-- ════════════════════════════════════════════════════════════════════════════
-- FUNCTIONS & TRIGGERS
-- ════════════════════════════════════════════════════════════════════════════

-- Auto-create profile on sign-up
create or replace function public.handle_new_user()
  returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data->>'display_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Block edits to locked character fields and update timestamp
create or replace function public.prevent_locked_character_edits()
  returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if old.is_locked and (
    new.species    is distinct from old.species    or
    new.class      is distinct from old.class      or
    new.background is distinct from old.background
  ) then
    raise exception 'Cannot edit locked character fields (species, class, background)';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger characters_prevent_locked_edits
  before update on public.characters
  for each row execute function public.prevent_locked_character_edits();

-- DM-only level-up RPC
create or replace function public.level_up_campaign(campaign_id uuid)
  returns void language plpgsql security definer set search_path = public
as $$
begin
  if not exists (
    select 1 from public.campaign_members
    where campaign_members.campaign_id = level_up_campaign.campaign_id
      and user_id = auth.uid() and role = 'dm'
  ) then
    raise exception 'Only the Dungeon Master can level up the campaign';
  end if;

  update public.characters
  set level = least(level + 1, 20), updated_at = now()
  where characters.campaign_id = level_up_campaign.campaign_id and status = 'active';
end;
$$;

grant execute on function public.level_up_campaign(uuid) to authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- REALTIME
-- ════════════════════════════════════════════════════════════════════════════

alter publication supabase_realtime add table public.characters;
alter publication supabase_realtime add table public.encounters;
alter publication supabase_realtime add table public.encounter_participants;
alter publication supabase_realtime add table public.campaign_notes;

-- ════════════════════════════════════════════════════════════════════════════
-- STORAGE
-- ════════════════════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'character-portraits',
  'character-portraits',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
) on conflict (id) do nothing;

create policy "portraits: public read"
  on storage.objects for select using (bucket_id = 'character-portraits');

create policy "portraits: owner insert"
  on storage.objects for insert
  with check (
    bucket_id = 'character-portraits'
    and auth.uid()::text = (string_to_array(name, '/'))[1]
  );

create policy "portraits: owner update"
  on storage.objects for update
  using (
    bucket_id = 'character-portraits'
    and auth.uid()::text = (string_to_array(name, '/'))[1]
  );

create policy "portraits: owner delete"
  on storage.objects for delete
  using (
    bucket_id = 'character-portraits'
    and auth.uid()::text = (string_to_array(name, '/'))[1]
  );
