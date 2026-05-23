-- Armor reference data (absent from the original SRD parse). Seeded with the
-- canonical 2024 SRD armor table so AC can be derived from equipped armor.

CREATE TABLE IF NOT EXISTS public.srd_armor (
  id                   uuid primary key default gen_random_uuid(),
  name                 text not null unique,
  category             text not null,                 -- light | medium | heavy | shield
  base_ac              int  not null,
  add_dex              boolean not null default false, -- add Dex modifier to AC
  max_dex              int,                            -- cap on Dex bonus (null = no cap)
  strength_req         int  not null default 0,
  stealth_disadvantage boolean not null default false,
  weight               numeric not null default 0
);

ALTER TABLE public.srd_armor ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "srd_armor_read" ON public.srd_armor;
CREATE POLICY "srd_armor_read" ON public.srd_armor
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "srd_armor_admin_write" ON public.srd_armor;
CREATE POLICY "srd_armor_admin_write" ON public.srd_armor
  FOR ALL TO authenticated USING (is_app_admin());

INSERT INTO public.srd_armor (name, category, base_ac, add_dex, max_dex, strength_req, stealth_disadvantage, weight) VALUES
  ('Padded Armor',     'light',  11, true,  null, 0,  true,  8),
  ('Leather Armor',    'light',  11, true,  null, 0,  false, 10),
  ('Studded Leather Armor', 'light', 12, true, null, 0, false, 13),
  ('Hide Armor',       'medium', 12, true,  2,    0,  false, 12),
  ('Chain Shirt',      'medium', 13, true,  2,    0,  false, 20),
  ('Scale Mail',       'medium', 14, true,  2,    0,  true,  45),
  ('Breastplate',      'medium', 14, true,  2,    0,  false, 20),
  ('Half Plate Armor', 'medium', 15, true,  2,    0,  true,  40),
  ('Ring Mail',        'heavy',  14, false, null, 0,  true,  40),
  ('Chain Mail',       'heavy',  16, false, null, 13, true,  55),
  ('Splint Armor',     'heavy',  17, false, null, 15, true,  60),
  ('Plate Armor',      'heavy',  18, false, null, 15, true,  65),
  ('Shield',           'shield', 2,  false, null, 0,  false, 6)
ON CONFLICT (name) DO NOTHING;
