import { supabase } from "@/lib/supabase";
import { SPECIES_TRAITS } from "../data/speciesTraits";

// Features that are handled by dedicated flows rather than listed as traits.
const SKIP_FEATURES = new Set(["Ability Score Improvement"]);

// Insert any of the species' SRD traits the character is missing (by name).
// Lets existing characters backfill species features. Returns count added.
export async function addMissingSpeciesFeatures(characterId: string, species: string): Promise<number> {
  const traits = SPECIES_TRAITS[species] ?? [];
  if (traits.length === 0) return 0;
  const { data: existing } = await supabase
    .from("character_features")
    .select("name")
    .eq("character_id", characterId);
  const existingNames = new Set((existing ?? []).map((e) => e.name as string));
  const toInsert = traits
    .filter((t) => !existingNames.has(t.name))
    .map((t, i) => ({
      character_id: characterId,
      name: t.name,
      level_gained: 1,
      source: "species",
      description: t.description,
      sort_order: i,
    }));
  if (toInsert.length === 0) return 0;
  await supabase.from("character_features").insert(toInsert);
  return toInsert.length;
}

interface SrdFeatureRow {
  feature_name: string;
  level: number;
}

// Pull the class's SRD features (with descriptions) up to `uptoLevel` and insert
// any the character doesn't already have. Idempotent — safe to call repeatedly
// (e.g. on each level-up or via a manual "sync" button). Returns count added.
export async function addMissingClassFeatures(
  characterId: string,
  className: string,
  uptoLevel: number,
): Promise<number> {
  const { data: featureRows } = await supabase
    .from("srd_class_features")
    .select("feature_name, level")
    .eq("class_name", className)
    .lte("level", uptoLevel)
    .order("level", { ascending: true });

  const features = ((featureRows as SrdFeatureRow[]) ?? []).filter(
    (f) => !SKIP_FEATURES.has(f.feature_name),
  );
  if (features.length === 0) return 0;

  // Descriptions live in a separate table, keyed by class + feature name.
  const { data: detailRows } = await supabase
    .from("srd_feature_details")
    .select("feature_name, description")
    .eq("class_name", className);
  const descByName = new Map<string, string>(
    (detailRows ?? []).map((d) => [d.feature_name as string, d.description as string]),
  );

  // Skip features the character already has (match on name).
  const { data: existing } = await supabase
    .from("character_features")
    .select("name")
    .eq("character_id", characterId);
  const existingNames = new Set((existing ?? []).map((e) => e.name as string));

  const toInsert = features
    .filter((f) => !existingNames.has(f.feature_name))
    .map((f, idx) => ({
      character_id: characterId,
      name: f.feature_name,
      level_gained: f.level,
      source: "class",
      description: descByName.get(f.feature_name) ?? null,
      sort_order: f.level * 100 + idx,
    }));

  if (toInsert.length === 0) return 0;
  await supabase.from("character_features").insert(toInsert);
  return toInsert.length;
}
