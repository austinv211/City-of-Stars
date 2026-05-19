-- Fix infinite recursion in campaign_members RLS policies.
--
-- The original policies on campaign_members queried campaign_members to check
-- membership/role, which re-triggered those same policies — infinite recursion.
-- Security-definer functions bypass RLS when they run, breaking the cycle.

create or replace function public.is_campaign_member(_campaign_id uuid)
  returns boolean language sql security definer stable set search_path = public
as $$
  select exists (
    select 1 from public.campaign_members
    where campaign_id = _campaign_id and user_id = auth.uid()
  );
$$;

create or replace function public.is_campaign_dm(_campaign_id uuid)
  returns boolean language sql security definer stable set search_path = public
as $$
  select exists (
    select 1 from public.campaign_members
    where campaign_id = _campaign_id and user_id = auth.uid() and role = 'dm'
  );
$$;

drop policy "campaign_members: same campaign read" on public.campaign_members;
drop policy "campaign_members: dm write"           on public.campaign_members;

create policy "campaign_members: same campaign read"
  on public.campaign_members for select
  using (public.is_campaign_member(campaign_id));

create policy "campaign_members: dm write"
  on public.campaign_members for all
  using     (public.is_campaign_dm(campaign_id))
  with check (public.is_campaign_dm(campaign_id));
