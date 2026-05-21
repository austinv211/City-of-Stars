-- ── Multi-role support ────────────────────────────────────────────────────────
-- Allows a single user to hold more than one role per campaign (e.g. both DM
-- and player) and a single email to be whitelisted under more than one app role.
-- The unique key becomes (email, app_role) and (campaign_id, user_id, role)
-- respectively, so each (entity, role) pair remains unique.

-- 1. allowed_emails: replace unique(email) with unique(email, app_role)
alter table public.allowed_emails
  drop constraint allowed_emails_email_key;

alter table public.allowed_emails
  add constraint allowed_emails_email_role_key unique (email, app_role);

-- 2. campaign_members: replace unique(campaign_id, user_id) with
--    unique(campaign_id, user_id, role)
alter table public.campaign_members
  drop constraint campaign_members_campaign_id_user_id_key;

alter table public.campaign_members
  add constraint campaign_members_campaign_id_user_id_role_key
    unique (campaign_id, user_id, role);

-- 3. Update get_campaign_members_with_email to include the row id so the
--    frontend can delete or update a specific (user, role) row.
create or replace function public.get_campaign_members_with_email(cid uuid)
returns table(
  id         uuid,
  user_id    uuid,
  email      text,
  role       text,
  joined_at  timestamptz
)
language sql
security definer
stable
as $$
  select cm.id, cm.user_id, u.email, cm.role, cm.joined_at
  from   public.campaign_members cm
  join   auth.users u on u.id = cm.user_id
  where  cm.campaign_id = cid
    and  exists (
           select 1 from public.campaign_members me
           where  me.campaign_id = cid
             and  me.user_id = auth.uid()
         )
  order by cm.joined_at;
$$;

grant execute on function public.get_campaign_members_with_email(uuid) to authenticated;
