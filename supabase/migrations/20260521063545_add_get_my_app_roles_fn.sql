-- Returns all app roles for the current user from allowed_emails.
-- Used by the frontend to determine app-level access (player nav, dm nav)
-- independent of campaign membership.
create or replace function public.get_my_app_roles()
returns text[]
language sql
security definer
stable
as $$
  select coalesce(array_agg(app_role::text), '{}')
  from public.allowed_emails
  where lower(email) = lower(
    (select email from auth.users where id = auth.uid())
  );
$$;
grant execute on function public.get_my_app_roles() to authenticated;
