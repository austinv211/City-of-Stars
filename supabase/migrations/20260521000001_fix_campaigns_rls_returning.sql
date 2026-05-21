-- ── Fix campaigns RLS: INSERT with RETURNING ──────────────────────────────────
-- Root cause: the AFTER INSERT trigger that adds the creator to campaign_members
-- runs AFTER PostgreSQL takes the snapshot used for evaluating the RETURNING
-- SELECT policy. So the trigger-inserted campaign_members row is invisible
-- during the RETURNING check, causing a "row-level security policy violation".
--
-- Fix: add `created_by = auth.uid()` to the SELECT policy so the creator can
-- always see their own freshly-inserted campaign without relying on the
-- campaign_members row being present yet.
--
-- Also ships: get_my_app_roles() and the corrected INSERT WITH CHECK policy
-- that were applied via MCP in a previous session but never committed to a
-- migration file.

-- 1. get_my_app_roles() — returns all app roles for the current user from
--    allowed_emails. Used by the campaigns INSERT policy so a user with
--    multiple roles (e.g. dm + player) is checked correctly.
create or replace function public.get_my_app_roles()
  returns text[]
  language sql
  security definer
  stable
  set search_path = public
as $$
  select coalesce(array_agg(ae.app_role::text), '{}')
  from public.allowed_emails ae
  where lower(ae.email) = lower(
    (select email from auth.users where id = auth.uid())
  );
$$;

grant execute on function public.get_my_app_roles() to authenticated;

-- 2. is_email_allowed() — lets the login page check the whitelist before
--    attempting sign-in, without needing to be authenticated.
create or replace function public.is_email_allowed(user_email text)
  returns boolean
  language sql
  security definer
  stable
  set search_path = public
as $$
  select exists (
    select 1 from public.allowed_emails
    where lower(email) = lower(user_email)
  );
$$;

grant execute on function public.is_email_allowed(text) to anon, authenticated;

-- 3. Fix campaigns SELECT policy: allow creator to always read their own campaign.
--    This resolves the snapshot timing issue with INSERT...RETURNING.
drop policy if exists "campaigns: members read" on public.campaigns;

create policy "campaigns: members read"
  on public.campaigns for select
  using (
    created_by = auth.uid()
    or exists (
      select 1 from public.campaign_members
      where campaign_id = campaigns.id and user_id = auth.uid()
    )
  );

-- 4. Restore campaigns INSERT policy to the correct multi-role check
--    (was temporarily set to `true` during debugging).
drop policy if exists "campaigns: dm or admin create" on public.campaigns;

create policy "campaigns: dm or admin create"
  on public.campaigns for insert
  with check (
    created_by = auth.uid()
    and (is_app_admin() or 'dm'::text = any (get_my_app_roles()))
  );

-- ── Live role updates ──────────────────────────────────────────────────────────
-- Allow users to read their own allowed_emails rows so Realtime can deliver
-- INSERT/UPDATE/DELETE events for their entries (RLS is checked for Realtime).
drop policy if exists "allowed_emails: own read" on public.allowed_emails;

create policy "allowed_emails: own read"
  on public.allowed_emails for select
  using (lower(email) = lower(auth.email()));

-- Publish both tables so the client can subscribe to role changes without a
-- full page reload.
do $$ begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'allowed_emails'
  ) then
    alter publication supabase_realtime add table public.allowed_emails;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'user_roles'
  ) then
    alter publication supabase_realtime add table public.user_roles;
  end if;
end $$;

-- ── Fix campaign_members Realtime on cascade delete ────────────────────────────
-- When a campaign is deleted, campaign_members rows cascade-delete. Supabase
-- Realtime evaluates the SELECT policy against the OLD row to decide whether to
-- deliver the DELETE event. The old policy used is_campaign_member() which queries
-- campaign_members — but by that point those rows are already gone, so the check
-- fails and the event is never sent. Adding `user_id = auth.uid()` lets Realtime
-- use the old row's user_id to authorise delivery of a user's own DELETE events.
drop policy if exists "campaign_members: same campaign read" on public.campaign_members;

create policy "campaign_members: same campaign read"
  on public.campaign_members for select
  using (user_id = auth.uid() or public.is_campaign_member(campaign_id));
