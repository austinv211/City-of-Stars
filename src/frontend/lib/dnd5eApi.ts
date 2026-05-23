// D&D 5e SRD API — https://www.dnd5eapi.co
// The 2024 PHB endpoints are not yet populated; all data comes from the 2014 SRD
// which shares the same monster/spell roster as the 2024 rules.
const BASE = "https://www.dnd5eapi.co/api";

async function apiFetch<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${BASE}${path}`);
    if (!res.ok) return null;
    return res.json() as Promise<T>;
  } catch {
    return null;
  }
}

// ── Shared list response ──────────────────────────────────────────────────────
interface ListResponse<T> {
  count: number;
  results: T[];
}

// ── Monsters ──────────────────────────────────────────────────────────────────

export interface DndMonsterSummary {
  index: string;
  name: string;
  url: string;
}

export interface DndMonsterDamage {
  damage_type: { index: string; name: string };
  damage_dice: string;
}

export interface DndMonsterAction {
  name: string;
  desc: string;
  attack_bonus?: number;
  damage?: DndMonsterDamage[];
}

export interface DndMonsterSpecialAbility {
  name: string;
  desc: string;
}

export interface DndMonster {
  index: string;
  name: string;
  size: string;
  type: string;
  alignment: string;
  hit_points: number;
  hit_dice: string;
  armor_class: Array<{ value: number; type: string }>;
  speed: { walk?: string; fly?: string; swim?: string; burrow?: string; climb?: string };
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
  challenge_rating: number;
  xp: number;
  senses: Record<string, string | number>;
  languages: string;
  damage_resistances: string[];
  damage_immunities: string[];
  condition_immunities: Array<{ name: string }>;
  special_abilities?: DndMonsterSpecialAbility[];
  actions?: DndMonsterAction[];
  legendary_actions?: Array<{ name: string; desc: string; attack_bonus?: number }>;
}

export async function searchMonsters(query: string): Promise<DndMonsterSummary[]> {
  if (!query.trim()) return [];
  const data = await apiFetch<ListResponse<DndMonsterSummary>>(
    `/monsters?name=${encodeURIComponent(query.trim())}`
  );
  return data?.results ?? [];
}

export async function getMonster(index: string): Promise<DndMonster | null> {
  return apiFetch<DndMonster>(`/monsters/${index}`);
}

/** Derive minimal NPC encounter defaults from a monster entry */
export function monsterToNpc(m: DndMonster) {
  const ac = m.armor_class?.[0]?.value ?? 12;
  const dexMod = Math.floor(((m.dexterity ?? 10) - 10) / 2);
  return { name: m.name, hp: m.hit_points, ac, initiative: dexMod };
}

/** Convert a full API monster to the custom_monsters DB row shape */
export function monsterToDbForm(m: DndMonster) {
  const ac = m.armor_class?.[0]?.value ?? 12;
  const dexMod = Math.floor(((m.dexterity ?? 10) - 10) / 2);
  const walkSpeed = parseInt(m.speed?.walk ?? "30") || 30;

  const actions = (m.actions ?? []).map((a) => ({
    name: a.name,
    desc: a.desc,
    attack_bonus: a.attack_bonus,
    damage_dice: a.damage?.[0]?.damage_dice ?? undefined,
    damage_type: a.damage?.[0]?.damage_type?.name ?? undefined,
  }));

  const special_abilities = (m.special_abilities ?? []).map((sa) => ({
    name: sa.name,
    desc: sa.desc,
  }));

  const legendary_actions = (m.legendary_actions ?? []).map((la) => ({
    name: la.name,
    desc: la.desc,
  }));

  const sensesStr = Object.entries(m.senses ?? {})
    .map(([k, v]) => `${k.replace(/_/g, " ")} ${v}`)
    .join(", ");

  return {
    name: m.name,
    size: m.size ?? "Medium",
    type: m.type ?? "humanoid",
    alignment: m.alignment ?? "",
    hp: m.hit_points,
    ac,
    speed: walkSpeed,
    cr: String(m.challenge_rating ?? "0"),
    xp: m.xp ?? 0,
    default_initiative: dexMod,
    str_score: m.strength ?? 10,
    dex_score: m.dexterity ?? 10,
    con_score: m.constitution ?? 10,
    int_score: m.intelligence ?? 10,
    wis_score: m.wisdom ?? 10,
    cha_score: m.charisma ?? 10,
    actions,
    special_abilities,
    legendary_actions,
    damage_resistances: m.damage_resistances ?? [],
    damage_immunities: m.damage_immunities ?? [],
    condition_immunities: (m.condition_immunities ?? []).map((ci) => ci.name),
    senses: sensesStr || null,
    languages: m.languages || null,
  };
}

// ── Equipment / items ─────────────────────────────────────────────────────────

export interface DndEquipmentSummary {
  index: string;
  name: string;
  url: string;
}

export interface DndEquipment {
  index: string;
  name: string;
  desc: string[];
  weight?: number;
  cost?: { quantity: number; unit: string };
  // Weapon-specific fields (present when equipment_category.name === "Weapon")
  equipment_category?: { name: string };
  weapon_category?: string;   // "Simple" | "Martial"
  weapon_range?: string;      // "Melee" | "Ranged"
  category_range?: string;    // "Simple Melee" | "Martial Ranged" etc.
  damage?: { damage_dice: string; damage_type: { name: string } };
  two_handed_damage?: { damage_dice: string; damage_type: { name: string } };
  range?: { normal: number; long?: number };
  properties?: { index: string; name: string; url: string }[];
}

export async function searchEquipment(query: string): Promise<DndEquipmentSummary[]> {
  if (!query.trim()) return [];
  const data = await apiFetch<ListResponse<DndEquipmentSummary>>(
    `/equipment?name=${encodeURIComponent(query.trim())}`
  );
  return data?.results ?? [];
}

export async function searchWeapons(query: string): Promise<DndEquipmentSummary[]> {
  if (!query.trim()) return [];
  const data = await apiFetch<ListResponse<DndEquipmentSummary>>(
    `/equipment?name=${encodeURIComponent(query.trim())}&equipment_category=weapon`
  );
  return data?.results ?? [];
}

export async function getEquipment(index: string): Promise<DndEquipment | null> {
  return apiFetch<DndEquipment>(`/equipment/${index}`);
}

// ── Spells ────────────────────────────────────────────────────────────────────

export interface DndSpellSummary {
  index: string;
  name: string;
  level: number;
  url: string;
}

export interface DndSpell {
  index: string;
  name: string;
  level: number;
  school: { name: string };
  casting_time: string;
  range: string;
  components: string[];
  duration: string;
  concentration: boolean;
  ritual: boolean;
  desc: string[];
  attack_type?: string;
  damage?: {
    damage_type?: { name: string };
    damage_at_character_level?: Record<string, string>;
    damage_at_slot_level?: Record<string, string>;
  };
  classes: Array<{ name: string }>;
}

export async function searchSpells(query: string): Promise<DndSpellSummary[]> {
  if (!query.trim()) return [];
  const data = await apiFetch<ListResponse<DndSpellSummary>>(
    `/spells?name=${encodeURIComponent(query.trim())}`
  );
  return data?.results ?? [];
}

export async function getSpell(index: string): Promise<DndSpell | null> {
  return apiFetch<DndSpell>(`/spells/${index}`);
}

export async function getDamageCantrips(query: string): Promise<DndSpellSummary[]> {
  const path = query.trim()
    ? `/spells?name=${encodeURIComponent(query.trim())}&level=0`
    : `/spells?level=0`;
  const data = await apiFetch<ListResponse<DndSpellSummary>>(path);
  return (data?.results ?? []).filter((s) => s.level === 0);
}

// ── Languages ─────────────────────────────────────────────────────────────────

export interface DndLanguage {
  index: string;
  name: string;
  type: string;
}

export async function getLanguages(): Promise<DndLanguage[]> {
  const data = await apiFetch<{ results: DndLanguage[] }>("/languages");
  return data?.results ?? [];
}

// ── Equipment categories ──────────────────────────────────────────────────────

export async function getEquipmentCategory(index: string): Promise<DndEquipmentSummary[]> {
  const data = await apiFetch<{ equipment: DndEquipmentSummary[] }>(`/equipment-categories/${index}`);
  return data?.equipment ?? [];
}

// ── Class data ────────────────────────────────────────────────────────────────

export interface DndClassLevel {
  level: number;
  features: { name: string; index: string }[];
  spellcasting?: {
    cantrips_known?: number;
    spells_known?: number;
    spell_slots_level_1?: number;
    spell_slots_level_2?: number;
    spell_slots_level_3?: number;
    spell_slots_level_4?: number;
    spell_slots_level_5?: number;
    spell_slots_level_6?: number;
    spell_slots_level_7?: number;
    spell_slots_level_8?: number;
    spell_slots_level_9?: number;
  };
}

export async function getClassLevel(classIndex: string, level: number): Promise<DndClassLevel | null> {
  return apiFetch<DndClassLevel>(`/classes/${classIndex}/levels/${level}`);
}

export async function getClassLevels(classIndex: string): Promise<DndClassLevel[]> {
  const data = await apiFetch<DndClassLevel[]>(`/classes/${classIndex}/levels`);
  return data ?? [];
}

export interface DndClassSpell {
  index: string;
  name: string;
  level: number;
  url: string;
}

export async function getClassSpells(classIndex: string): Promise<DndClassSpell[]> {
  const data = await apiFetch<{ results: DndClassSpell[] }>(`/classes/${classIndex}/spells`);
  return data?.results ?? [];
}

// ── Feats ─────────────────────────────────────────────────────────────────────

export interface DndFeat {
  index: string;
  name: string;
  prerequisites: { ability_score?: { name: string }; minimum_score?: number }[];
  desc: string[];
}

export async function getFeats(): Promise<{ index: string; name: string }[]> {
  const data = await apiFetch<{ results: { index: string; name: string }[] }>("/feats");
  return data?.results ?? [];
}

// ── Local SRD queries (Supabase DB — populated by scripts/parse-srd.mjs) ──────
// These are preferred over the external API when available.

import { supabase } from "@/lib/supabase";

export interface SrdClassFeatureRow {
  class_name: string;
  level: number;
  feature_name: string;
}

export interface SrdSpell {
  index: string;
  name: string;
  level: number;
  school: string | null;
  casting_time: string | null;
  range_text: string | null;
  components: string[] | null;
  duration: string | null;
  concentration: boolean;
  ritual: boolean;
  description: string | null;
  damage_type: string | null;
  damage_dice: string | null;
  classes: string[] | null;
  attack_type: string | null;
}

export interface SrdFeat {
  index: string;
  name: string;
  category: string | null;
  prerequisite: string | null;
  description: string;
}

/** Returns class features for a specific class + level from local SRD DB.
 *  Falls back gracefully to empty array if table not populated yet. */
export async function getLocalClassFeatures(
  className: string,
  level: number
): Promise<{ name: string; index: string }[]> {
  try {
    const { data, error } = await supabase
      .from("srd_class_features")
      .select("feature_name")
      .eq("class_name", className)
      .eq("level", level);
    if (error || !data?.length) return [];
    return data.map((r: { feature_name: string }) => ({
      name: r.feature_name,
      index: r.feature_name.toLowerCase().replace(/\s+/g, "-"),
    }));
  } catch {
    return [];
  }
}

/** Get a single SRD spell by exact index. Returns null if not found. */
export async function getLocalSpell(index: string): Promise<SrdSpell | null> {
  try {
    const { data } = await supabase
      .from("srd_spells")
      .select("*")
      .eq("index", index)
      .maybeSingle();
    return (data as SrdSpell) ?? null;
  } catch {
    return null;
  }
}

/** All local SRD spells, ordered by level then name (for browse/reference). */
export async function getAllLocalSpells(): Promise<SrdSpell[]> {
  try {
    const { data } = await supabase
      .from("srd_spells")
      .select("*")
      .order("level", { ascending: true })
      .order("name", { ascending: true });
    return (data as SrdSpell[]) ?? [];
  } catch {
    return [];
  }
}

/** Search local SRD spells by name. Falls back to empty array if not populated. */
export async function searchLocalSpells(query: string): Promise<SrdSpell[]> {
  if (!query.trim()) return [];
  try {
    const { data } = await supabase
      .from("srd_spells")
      .select("*")
      .ilike("name", `%${query.trim()}%`)
      .order("level", { ascending: true })
      .order("name", { ascending: true })
      .limit(20);
    return (data as SrdSpell[]) ?? [];
  } catch {
    return [];
  }
}

/** Get all feats from local SRD DB. Falls back to empty array. */
export async function getLocalFeats(): Promise<SrdFeat[]> {
  try {
    const { data } = await supabase
      .from("srd_feats")
      .select("*")
      .order("name", { ascending: true });
    return (data as SrdFeat[]) ?? [];
  } catch {
    return [];
  }
}

export async function getFeat(index: string): Promise<DndFeat | null> {
  return apiFetch<DndFeat>(`/feats/${index}`);
}

// ── srd_classes ────────────────────────────────────────────────────────────

export interface SrdClass {
  index: string;
  name: string;
  hit_die: number;
  primary_ability: string;
  saving_throws: string[];
  skill_count: number;
  skill_choices: string[];
  weapon_proficiencies: string | null;
  armor_proficiencies: string | null;
  starting_equipment: string | null;
  subclasses: string[];
  is_spellcaster: boolean;
  spellcasting_ability: string | null;
  /** 20-element array, each element = 9-element array [slot_lvl_1..9] */
  spell_slots_by_level: number[][] | null;
}

export async function getSrdClasses(): Promise<SrdClass[]> {
  try {
    const { data } = await supabase
      .from("srd_classes")
      .select("*")
      .order("name", { ascending: true });
    return (data as SrdClass[]) ?? [];
  } catch {
    return [];
  }
}

export async function getSrdClass(name: string): Promise<SrdClass | null> {
  try {
    const { data } = await supabase
      .from("srd_classes")
      .select("*")
      .ilike("name", name)
      .maybeSingle();
    return (data as SrdClass) ?? null;
  } catch {
    return null;
  }
}

/** Returns the 9-element spell slot array for a class at a given level (1-indexed). */
export async function getSpellSlotsForLevel(
  className: string,
  level: number
): Promise<number[] | null> {
  const cls = await getSrdClass(className);
  if (!cls?.spell_slots_by_level) return null;
  return cls.spell_slots_by_level[level - 1] ?? null;
}

// ── srd_backgrounds ────────────────────────────────────────────────────────

export interface SrdBackground {
  index: string;
  name: string;
  ability_scores: string[];
  feat: string | null;
  skill_proficiencies: string[];
  tool_proficiency: string | null;
  equipment_description: string | null;
}

export async function getSrdBackgrounds(): Promise<SrdBackground[]> {
  try {
    const { data } = await supabase
      .from("srd_backgrounds")
      .select("*")
      .order("name", { ascending: true });
    return (data as SrdBackground[]) ?? [];
  } catch {
    return [];
  }
}

export async function getSrdBackground(name: string): Promise<SrdBackground | null> {
  try {
    const { data } = await supabase
      .from("srd_backgrounds")
      .select("*")
      .ilike("name", name)
      .maybeSingle();
    return (data as SrdBackground) ?? null;
  } catch {
    return null;
  }
}

// ── srd_feature_details ────────────────────────────────────────────────────

export interface SrdFeatureDetail {
  class_name: string;
  feature_name: string;
  level: number | null;
  description: string;
}

export async function getFeatureDescription(
  className: string,
  featureName: string
): Promise<string | null> {
  try {
    const { data } = await supabase
      .from("srd_feature_details")
      .select("description")
      .ilike("class_name", className)
      .ilike("feature_name", featureName)
      .maybeSingle();
    return (data as { description: string } | null)?.description ?? null;
  } catch {
    return null;
  }
}

export async function getClassFeatureDetails(className: string): Promise<SrdFeatureDetail[]> {
  try {
    const { data } = await supabase
      .from("srd_feature_details")
      .select("class_name, feature_name, level, description")
      .ilike("class_name", className)
      .order("level", { ascending: true });
    return (data as SrdFeatureDetail[]) ?? [];
  } catch {
    return [];
  }
}

// ── srd_rules (glossary) ───────────────────────────────────────────────────

export interface SrdRule {
  id: string;
  category: string;
  title: string;
  content: string;
}

export async function searchRulesGlossary(query: string): Promise<SrdRule[]> {
  if (!query.trim()) return [];
  try {
    const { data } = await supabase
      .from("srd_rules")
      .select("id, category, title, content")
      .or(`title.ilike.%${query.trim()}%,content.ilike.%${query.trim()}%`)
      .order("title", { ascending: true })
      .limit(25);
    return (data as SrdRule[]) ?? [];
  } catch {
    return [];
  }
}

export async function getRulesGlossaryByCategory(category?: string): Promise<SrdRule[]> {
  try {
    let q = supabase
      .from("srd_rules")
      .select("id, category, title, content")
      .order("title", { ascending: true });
    if (category) q = q.eq("category", category);
    const { data } = await q;
    return (data as SrdRule[]) ?? [];
  } catch {
    return [];
  }
}
