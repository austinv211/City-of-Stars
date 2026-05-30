
-- Enable realtime for character sub-tables so edits sync across clients.
-- REPLICA IDENTITY FULL is required so character_id filter works on DELETE events.

ALTER TABLE public.ability_scores REPLICA IDENTITY FULL;
ALTER TABLE public.character_inventory REPLICA IDENTITY FULL;
ALTER TABLE public.character_attacks REPLICA IDENTITY FULL;
ALTER TABLE public.character_spells REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.ability_scores;
ALTER PUBLICATION supabase_realtime ADD TABLE public.character_inventory;
ALTER PUBLICATION supabase_realtime ADD TABLE public.character_attacks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.character_spells;

-- Indexes for realtime filter performance (character_id=eq.X)
CREATE INDEX IF NOT EXISTS ability_scores_character_id_idx ON public.ability_scores (character_id);
CREATE INDEX IF NOT EXISTS character_inventory_character_id_idx ON public.character_inventory (character_id);
CREATE INDEX IF NOT EXISTS character_attacks_character_id_idx ON public.character_attacks (character_id);
CREATE INDEX IF NOT EXISTS character_spells_character_id_idx ON public.character_spells (character_id);
