
ALTER TABLE public.dice_rolls
  ADD COLUMN IF NOT EXISTS character_name text,
  ADD COLUMN IF NOT EXISTS rolled_by_dm boolean NOT NULL DEFAULT false;
