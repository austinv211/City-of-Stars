-- character_proficiencies drives skill/save math shown in encounters; publish it
-- for realtime so proficiency changes propagate live like the other sub-tables.
ALTER TABLE public.character_proficiencies REPLICA IDENTITY FULL;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.character_proficiencies;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS character_proficiencies_character_id_idx
  ON public.character_proficiencies (character_id);
