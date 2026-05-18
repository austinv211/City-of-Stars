-- ════════════════════════════════════════════════════════════════════════════
-- APP ROLES & EMAIL WHITELIST
-- ════════════════════════════════════════════════════════════════════════════

create type public.app_role as enum ('admin', 'dm', 'player');

-- ── user_roles ────────────────────────────────────────────────────────────────
create table public.user_roles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  app_role   public.app_role not null default 'player',
  updated_at timestamptz not null default now()
);

alter table public.user_roles enable row level security;
grant select, insert, update, delete on public.user_roles to authenticated;

-- ── allowed_emails ────────────────────────────────────────────────────────────
create table public.allowed_emails (
  id         uuid primary key default uuid_generate_v4(),
  email      text not null unique,
  app_role   public.app_role not null default 'player',
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.allowed_emails enable row level security;
grant select, insert, update, delete on public.allowed_emails to authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- SECURITY DEFINER HELPERS
-- ════════════════════════════════════════════════════════════════════════════

create or replace function public.get_my_app_role()
  returns public.app_role language sql security definer stable set search_path = public
as $$
  select app_role from public.user_roles where user_id = auth.uid();
$$;

create or replace function public.is_app_admin()
  returns boolean language sql security definer stable set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and app_role = 'admin'
  );
$$;

-- Bypasses campaigns RLS when called from session_notes policies
create or replace function public.get_campaign_current_session(_campaign_id uuid)
  returns int language sql security definer stable set search_path = public
as $$
  select current_session from public.campaigns where id = _campaign_id;
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- POLICIES: user_roles & allowed_emails
-- ════════════════════════════════════════════════════════════════════════════

create policy "user_roles: own read"
  on public.user_roles for select
  using (user_id = auth.uid() or public.is_app_admin());

create policy "user_roles: admin write"
  on public.user_roles for all
  using     (public.is_app_admin())
  with check (public.is_app_admin());

create policy "allowed_emails: admin all"
  on public.allowed_emails for all
  using     (public.is_app_admin())
  with check (public.is_app_admin());

-- ════════════════════════════════════════════════════════════════════════════
-- CAMPAIGN MEMBER CONSTRAINTS
-- ════════════════════════════════════════════════════════════════════════════

-- Only one DM allowed per campaign
create unique index one_dm_per_campaign
  on public.campaign_members (campaign_id) where role = 'dm';

-- Auto-insert creator as DM when a campaign is created, so they can
-- immediately see their own campaign via the members-read policy
create or replace function public.add_campaign_creator_as_dm()
  returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.campaign_members (campaign_id, user_id, role)
  values (new.id, new.created_by, 'dm');
  return new;
end;
$$;

create trigger campaigns_auto_add_dm
  after insert on public.campaigns
  for each row execute function public.add_campaign_creator_as_dm();

-- ════════════════════════════════════════════════════════════════════════════
-- CAMPAIGNS: add current_session, replace creator write policy
-- ════════════════════════════════════════════════════════════════════════════

alter table public.campaigns add column current_session int not null default 1;

drop policy "campaigns: creator write" on public.campaigns;

-- Only users with an app-level dm or admin role can create campaigns
create policy "campaigns: dm or admin create"
  on public.campaigns for insert
  with check (
    created_by = auth.uid()
    and public.get_my_app_role() = any(array['dm'::public.app_role, 'admin'::public.app_role])
  );

create policy "campaigns: creator update"
  on public.campaigns for update
  using     (created_by = auth.uid())
  with check (created_by = auth.uid());

create policy "campaigns: creator delete"
  on public.campaigns for delete
  using (created_by = auth.uid());

-- ════════════════════════════════════════════════════════════════════════════
-- SESSION NOTES (replaces campaign_notes)
-- ════════════════════════════════════════════════════════════════════════════

alter publication supabase_realtime drop table public.campaign_notes;

drop policy "campaign_notes: members read" on public.campaign_notes;
drop policy "campaign_notes: dm write"     on public.campaign_notes;
drop table public.campaign_notes;

create table public.session_notes (
  id             uuid primary key default uuid_generate_v4(),
  campaign_id    uuid not null references public.campaigns(id) on delete cascade,
  session_number int not null,
  -- 'dm_only': visible only to the campaign DM
  -- 'party':   visible to all members within the session window
  visibility     text not null default 'party' check (visibility in ('dm_only', 'party')),
  content        text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (campaign_id, session_number, visibility)
);

alter table public.session_notes enable row level security;
grant select, insert, update, delete on public.session_notes to authenticated;

-- DM can read and write all notes (both visibilities) for their campaign
create policy "session_notes: dm all"
  on public.session_notes for all
  using     (public.is_campaign_dm(campaign_id))
  with check (public.is_campaign_dm(campaign_id));

-- Players see party notes only for the current session and the one before it
create policy "session_notes: party read"
  on public.session_notes for select
  using (
    visibility = 'party'
    and public.is_campaign_member(campaign_id)
    and session_number between
        public.get_campaign_current_session(campaign_id) - 1
        and public.get_campaign_current_session(campaign_id)
  );

alter publication supabase_realtime add table public.session_notes;

-- ════════════════════════════════════════════════════════════════════════════
-- set_campaign_session RPC
-- ════════════════════════════════════════════════════════════════════════════

create or replace function public.set_campaign_session(p_campaign_id uuid, p_session int)
  returns void language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_campaign_dm(p_campaign_id) then
    raise exception 'Only the Dungeon Master can change the session number';
  end if;

  if p_session < 1 then
    raise exception 'Session number must be at least 1';
  end if;

  update public.campaigns
  set current_session = p_session
  where id = p_campaign_id;
end;
$$;

grant execute on function public.set_campaign_session(uuid, int) to authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- handle_new_user: check whitelist and assign app role on signup
-- ════════════════════════════════════════════════════════════════════════════

create or replace function public.handle_new_user()
  returns trigger language plpgsql security definer set search_path = public
as $$
declare
  _role public.app_role;
begin
  select app_role into _role
  from public.allowed_emails
  where lower(email) = lower(new.email);

  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data->>'display_name');

  if _role is not null then
    insert into public.user_roles (user_id, app_role)
    values (new.id, _role);
  end if;

  return new;
end;
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- BOOTSTRAP ADMIN
-- ════════════════════════════════════════════════════════════════════════════

insert into public.allowed_emails (email, app_role)
values ('vargasona@gmail.com', 'admin')
on conflict (email) do update set app_role = 'admin';

-- Backfill user_roles for the admin who is already registered
insert into public.user_roles (user_id, app_role)
select id, 'admin'::public.app_role
from auth.users
where email = 'vargasona@gmail.com'
on conflict (user_id) do update set app_role = 'admin';
