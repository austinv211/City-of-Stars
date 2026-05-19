-- SRD reference data tables (read-only for all authenticated users, write for admin only)

CREATE TABLE IF NOT EXISTS srd_class_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_name text NOT NULL,
  level int NOT NULL CHECK (level >= 1 AND level <= 20),
  feature_name text NOT NULL,
  UNIQUE (class_name, level, feature_name)
);

CREATE TABLE IF NOT EXISTS srd_spells (
  index text PRIMARY KEY,
  name text NOT NULL,
  level int NOT NULL CHECK (level >= 0 AND level <= 9),
  school text,
  casting_time text,
  range_text text,
  components text[],
  duration text,
  concentration bool NOT NULL DEFAULT false,
  ritual bool NOT NULL DEFAULT false,
  description text,
  damage_type text,
  damage_dice text,
  classes text[],
  attack_type text
);

CREATE TABLE IF NOT EXISTS srd_feats (
  index text PRIMARY KEY,
  name text NOT NULL,
  category text,
  prerequisite text,
  description text NOT NULL
);

CREATE TABLE IF NOT EXISTS srd_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  title text NOT NULL,
  content text NOT NULL
);

-- RLS: authenticated users can read, only admin can write
ALTER TABLE srd_class_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE srd_spells ENABLE ROW LEVEL SECURITY;
ALTER TABLE srd_feats ENABLE ROW LEVEL SECURITY;
ALTER TABLE srd_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "srd_class_features_read" ON srd_class_features
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "srd_spells_read" ON srd_spells
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "srd_feats_read" ON srd_feats
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "srd_rules_read" ON srd_rules
  FOR SELECT TO authenticated USING (true);

-- Admin write access (using the is_app_admin() function defined in earlier migration)
CREATE POLICY "srd_class_features_admin_write" ON srd_class_features
  FOR ALL TO authenticated USING (is_app_admin()) WITH CHECK (is_app_admin());
CREATE POLICY "srd_spells_admin_write" ON srd_spells
  FOR ALL TO authenticated USING (is_app_admin()) WITH CHECK (is_app_admin());
CREATE POLICY "srd_feats_admin_write" ON srd_feats
  FOR ALL TO authenticated USING (is_app_admin()) WITH CHECK (is_app_admin());
CREATE POLICY "srd_rules_admin_write" ON srd_rules
  FOR ALL TO authenticated USING (is_app_admin()) WITH CHECK (is_app_admin());
