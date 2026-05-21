-- Fix: the previous own-read policy used a subquery on auth.users which the
-- authenticated role cannot access, causing all allowed_emails queries to fail.
-- auth.email() reads from JWT claims directly — no table access required.
DROP POLICY IF EXISTS "allowed_emails: own read" ON public.allowed_emails;

CREATE POLICY "allowed_emails: own read"
  ON public.allowed_emails FOR SELECT
  USING (lower(email) = lower(auth.email()));
