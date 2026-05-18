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
}

export async function searchEquipment(query: string): Promise<DndEquipmentSummary[]> {
  if (!query.trim()) return [];
  const data = await apiFetch<ListResponse<DndEquipmentSummary>>(
    `/equipment?name=${encodeURIComponent(query.trim())}`
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
