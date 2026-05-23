-- Anon-accessible check so the frontend can gate sign-in/sign-up before auth.
-- Security definer so it can read allowed_emails despite admin-only RLS.
create or replace function public.is_email_allowed(user_email text)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.allowed_emails
    where lower(email) = lower(user_email)
  );
$$;
grant execute on function public.is_email_allowed(text) to anon, authenticated;
