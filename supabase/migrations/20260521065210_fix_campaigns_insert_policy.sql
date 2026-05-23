-- Replace the fragile get_my_app_role() scalar check with robust EXISTS-based checks.
-- is_app_admin() uses EXISTS so it returns false (never null) when the user has no role.
-- get_my_app_roles() returns text[] from allowed_emails via SECURITY DEFINER.
drop policy "campaigns: dm or admin create" on public.campaigns;

create policy "campaigns: dm or admin create"
  on public.campaigns for insert
  with check (
    created_by = auth.uid()
    and (
      is_app_admin()
      or 'dm' = any(get_my_app_roles())
    )
  );
