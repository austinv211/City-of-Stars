-- Species reference data. Numeric traits transcribed from the SRD source
-- (downfallx/dnd-5e-srd-markdown, character-origins.md). The SRD has 9 species;
-- Aasimar is added from the 2024 PHB (Medium / 30 ft / Darkvision 60) since the app
-- offers it. size 'Small or Medium' = choose at creation (defaults to Medium).

CREATE TABLE IF NOT EXISTS public.srd_species (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  size        text not null,          -- 'Small' | 'Medium' | 'Small or Medium'
  speed       int  not null default 30,
  darkvision  int  not null default 0,
  source      text not null default 'srd'  -- 'srd' | 'phb'
);

ALTER TABLE public.srd_species ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "srd_species_read" ON public.srd_species;
CREATE POLICY "srd_species_read" ON public.srd_species
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "srd_species_admin_write" ON public.srd_species;
CREATE POLICY "srd_species_admin_write" ON public.srd_species
  FOR ALL TO authenticated USING (is_app_admin());

INSERT INTO public.srd_species (name, size, speed, darkvision, source) VALUES
  ('Dragonborn', 'Medium',          30, 60,  'srd'),
  ('Dwarf',      'Medium',          30, 120, 'srd'),
  ('Elf',        'Medium',          30, 60,  'srd'),
  ('Gnome',      'Small',           30, 60,  'srd'),
  ('Goliath',    'Medium',          35, 0,   'srd'),
  ('Halfling',   'Small',           30, 0,   'srd'),
  ('Human',      'Small or Medium', 30, 0,   'srd'),
  ('Orc',        'Medium',          30, 120, 'srd'),
  ('Tiefling',   'Small or Medium', 30, 60,  'srd'),
  ('Aasimar',    'Medium',          30, 60,  'phb')
ON CONFLICT (name) DO NOTHING;
