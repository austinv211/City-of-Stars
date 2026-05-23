
-- 1. get_my_app_roles()
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

-- 2. is_email_allowed()
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

-- 3. Fix campaigns SELECT policy
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

-- 4. Fix campaigns INSERT policy
drop policy if exists "campaigns: dm or admin create" on public.campaigns;

create policy "campaigns: dm or admin create"
  on public.campaigns for insert
  with check (
    created_by = auth.uid()
    and (is_app_admin() or 'dm'::text = any (get_my_app_roles()))
  );

-- 5. allowed_emails own read (for Realtime)
drop policy if exists "allowed_emails: own read" on public.allowed_emails;

create policy "allowed_emails: own read"
  on public.allowed_emails for select
  using (lower(email) = lower((select email from auth.users where id = auth.uid())));

-- 6. Publish tables for Realtime
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

-- 7. Fix campaign_members SELECT policy for Realtime cascade deletes
drop policy if exists "campaign_members: same campaign read" on public.campaign_members;

create policy "campaign_members: same campaign read"
  on public.campaign_members for select
  using (user_id = auth.uid() or public.is_campaign_member(campaign_id));
