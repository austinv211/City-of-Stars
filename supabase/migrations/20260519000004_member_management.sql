-- ── Member management helpers ────────────────────────────────────────────────
-- Lets DMs look up users by email (auth.users is not directly queryable by
-- clients) and retrieve member emails for their campaign roster.

-- Returns the auth user id for a given email, or NULL if not found.
-- Used by the DM to add a member by typing their email address.
create or replace function public.find_user_id_by_email(target_email text)
returns uuid
language sql
security definer
stable
as $$
  select id from auth.users where lower(email) = lower(target_email) limit 1;
$$;

grant execute on function public.find_user_id_by_email(text) to authenticated;

-- Returns member list for a campaign: user_id, email, role.
-- Only the campaign's DM (or any member) can call this; RLS on
-- campaign_members already restricts which campaign_ids are visible.
create or replace function public.get_campaign_members_with_email(cid uuid)
returns table(user_id uuid, email text, role text, joined_at timestamptz)
language sql
security definer
stable
as $$
  select cm.user_id, u.email, cm.role, cm.joined_at
  from public.campaign_members cm
  join auth.users u on u.id = cm.user_id
  where cm.campaign_id = cid
    and exists (
      select 1 from public.campaign_members me
      where me.campaign_id = cid and me.user_id = auth.uid()
    )
  order by cm.joined_at;
$$;

grant execute on function public.get_campaign_members_with_email(uuid) to authenticated;
