-- srd_classes: full class data with spell slot progression
CREATE TABLE IF NOT EXISTS srd_classes (
  index text PRIMARY KEY,
  name text NOT NULL,
  hit_die int NOT NULL DEFAULT 8,
  primary_ability text NOT NULL DEFAULT '',
  saving_throws text[] NOT NULL DEFAULT '{}',
  skill_count int NOT NULL DEFAULT 2,
  skill_choices text[] NOT NULL DEFAULT '{}',
  weapon_proficiencies text,
  armor_proficiencies text,
  starting_equipment text,
  subclasses text[] NOT NULL DEFAULT '{}',
  is_spellcaster bool NOT NULL DEFAULT false,
  spellcasting_ability text,
  -- 20-row JSONB array, each row = 9 slot counts [lvl1..lvl9]
  spell_slots_by_level jsonb
);

-- srd_backgrounds: backgrounds from character-origins.md
CREATE TABLE IF NOT EXISTS srd_backgrounds (
  index text PRIMARY KEY,
  name text NOT NULL,
  ability_scores text[] NOT NULL DEFAULT '{}',
  feat text,
  skill_proficiencies text[] NOT NULL DEFAULT '{}',
  tool_proficiency text,
  equipment_description text
);

-- srd_feature_details: per-feature descriptions from classes.md
CREATE TABLE IF NOT EXISTS srd_feature_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_name text NOT NULL,
  feature_name text NOT NULL,
  level int,
  description text NOT NULL DEFAULT '',
  UNIQUE (class_name, feature_name)
);

-- RLS: same pattern — authenticated read, admin write
ALTER TABLE srd_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE srd_backgrounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE srd_feature_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "srd_classes_read" ON srd_classes
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "srd_backgrounds_read" ON srd_backgrounds
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "srd_feature_details_read" ON srd_feature_details
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "srd_classes_admin_write" ON srd_classes
  FOR ALL TO authenticated USING (is_app_admin()) WITH CHECK (is_app_admin());
CREATE POLICY "srd_backgrounds_admin_write" ON srd_backgrounds
  FOR ALL TO authenticated USING (is_app_admin()) WITH CHECK (is_app_admin());
CREATE POLICY "srd_feature_details_admin_write" ON srd_feature_details
  FOR ALL TO authenticated USING (is_app_admin()) WITH CHECK (is_app_admin());
