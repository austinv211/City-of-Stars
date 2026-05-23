
ALTER TABLE srd_feature_details DROP CONSTRAINT IF EXISTS srd_feature_details_class_name_feature_name_key;
ALTER TABLE srd_feature_details ADD CONSTRAINT srd_feature_details_class_feature_level_key UNIQUE (class_name, feature_name, level);
