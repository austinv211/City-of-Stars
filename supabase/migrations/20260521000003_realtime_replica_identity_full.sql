-- Realtime filters on DELETE events only work when the deleted row's columns
-- are present in the WAL. DEFAULT replica identity only includes the PK (id),
-- so a filter like email=eq.X or user_id=eq.X can't match DELETE events.
-- FULL replica identity logs every column, enabling accurate filter delivery.
ALTER TABLE public.allowed_emails REPLICA IDENTITY FULL;
ALTER TABLE public.user_roles REPLICA IDENTITY FULL;
