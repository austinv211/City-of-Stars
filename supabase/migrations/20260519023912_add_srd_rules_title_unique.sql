ALTER TABLE srd_rules ADD COLUMN IF NOT EXISTS slug text;
UPDATE srd_rules SET slug = lower(regexp_replace(title, '[^a-z0-9]+', '-', 'gi')) WHERE slug IS NULL;
ALTER TABLE srd_rules ADD CONSTRAINT srd_rules_title_unique UNIQUE (title);
