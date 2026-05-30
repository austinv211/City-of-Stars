// 2024 ruleset mechanics derived verbatim from the parsed `srd_rules` glossary.
// Single source of truth for condition/exhaustion roll effects, carrying capacity,
// and suggested AC — shared by the character sheet and the encounter action panel.

import type { AbilityScores } from "../types/character.types";
import { abilityModifier } from "../types/character.types";

// ── Size ────────────────────────────────────────────────────────────────────
export const SIZES = ["Tiny", "Small", "Medium", "Large", "Huge", "Gargantuan"] as const;
export type Size = (typeof SIZES)[number];

// ── Conditions (14 stateful conditions; Exhaustion is leveled, tracked separately) ──
export const SHEET_CONDITIONS = [
  "Blinded", "Charmed", "Deafened", "Frightened", "Grappled",
  "Incapacitated", "Invisible", "Paralyzed", "Petrified", "Poisoned",
  "Prone", "Restrained", "Stunned", "Unconscious",
] as const;

// Effects on the AFFECTED creature's own d20 rolls. Only effects that are
// unambiguous on the roller are flagged for auto-apply; situational effects
// (attacker distance, line of sight, target identity) live in `note` as hints.
export interface ConditionRollEffect {
  attackDisadvantage?: boolean;
  attackAdvantage?: boolean;
  abilityCheckDisadvantage?: boolean;
  dexSaveDisadvantage?: boolean;
  autoFailStrDexSaves?: boolean;
  incapacitated?: boolean; // no action/bonus/reaction; Concentration broken
  note: string;
}

export const CONDITION_EFFECTS: Record<string, ConditionRollEffect> = {
  Blinded: {
    attackDisadvantage: true,
    note: "Can't see; auto-fail sight-based checks. Attacks against you have advantage; your attacks have disadvantage.",
  },
  Charmed: {
    note: "Can't attack the charmer or target them with harmful effects. The charmer has advantage on social checks with you.",
  },
  Deafened: {
    note: "Can't hear; auto-fail any ability check that requires hearing.",
  },
  Frightened: {
    attackDisadvantage: true,
    abilityCheckDisadvantage: true,
    note: "While the source is in line of sight: disadvantage on ability checks and attack rolls; can't willingly move closer to it.",
  },
  Grappled: {
    note: "Speed 0. Disadvantage on attack rolls against any target other than the grappler.",
  },
  Incapacitated: {
    incapacitated: true,
    note: "No action, bonus action, or reaction; Concentration broken; can't speak. Disadvantage on Initiative if rolling now.",
  },
  Invisible: {
    attackAdvantage: true,
    note: "Attacks against you have disadvantage; your attacks have advantage; advantage on Initiative.",
  },
  Paralyzed: {
    incapacitated: true,
    autoFailStrDexSaves: true,
    note: "Incapacitated; speed 0; auto-fail STR/DEX saves. Attacks against you have advantage; any hit within 5 ft is a critical hit.",
  },
  Petrified: {
    incapacitated: true,
    autoFailStrDexSaves: true,
    note: "Incapacitated; speed 0; auto-fail STR/DEX saves; resistance to all damage; immune to poison. Attacks against you have advantage.",
  },
  Poisoned: {
    attackDisadvantage: true,
    abilityCheckDisadvantage: true,
    note: "Disadvantage on attack rolls and ability checks.",
  },
  Prone: {
    attackDisadvantage: true,
    note: "Disadvantage on your attack rolls. Attacks against you have advantage within 5 ft, disadvantage from farther away.",
  },
  Restrained: {
    attackDisadvantage: true,
    dexSaveDisadvantage: true,
    note: "Speed 0; disadvantage on attack rolls and DEX saves. Attacks against you have advantage.",
  },
  Stunned: {
    incapacitated: true,
    autoFailStrDexSaves: true,
    note: "Incapacitated; auto-fail STR/DEX saves. Attacks against you have advantage.",
  },
  Unconscious: {
    incapacitated: true,
    autoFailStrDexSaves: true,
    note: "Incapacitated and prone; speed 0; auto-fail STR/DEX saves. Attacks against you have advantage; any hit within 5 ft is a critical hit.",
  },
};

// ── Exhaustion (2024): each level −2 to all D20 Tests and −5 ft Speed; 6 = death ──
export function exhaustionD20Penalty(level: number): number {
  return -2 * clampExhaustion(level);
}
export function exhaustionSpeedPenalty(level: number): number {
  return -5 * clampExhaustion(level);
}
function clampExhaustion(level: number): number {
  return Math.max(0, Math.min(6, level || 0));
}

// ── Carrying Capacity (Strength × 15 for Small/Medium; scaled by size) ────────
const SIZE_CAPACITY_MULTIPLIER: Record<string, number> = {
  Tiny: 0.5, Small: 1, Medium: 1, Large: 2, Huge: 4, Gargantuan: 8,
};
export function carryingCapacity(strengthScore: number, size = "Medium"): number {
  return strengthScore * 15 * (SIZE_CAPACITY_MULTIPLIER[size] ?? 1);
}

// ── Jack of All Trades (2024 Bard, level 2+) ─────────────────────────────────
// Adds half proficiency bonus (round down) to ability checks that don't already
// include proficiency, and to Initiative. Does NOT apply to saving throws.
export function hasJackOfAllTrades(className: string, level: number): boolean {
  return (className ?? "").toLowerCase() === "bard" && level >= 2;
}
export function halfProficiencyBonus(proficiencyBonus: number): number {
  return Math.floor(proficiencyBonus / 2);
}

// ── Suggested Armor Class (base 10 + DEX; Unarmored Defense for Barb/Monk) ────
export interface AcSuggestion {
  base: number;
  unarmoredLabel?: string;
  unarmoredValue?: number;
}
export function suggestedAC(final: AbilityScores, className: string): AcSuggestion {
  const dex = abilityModifier(final.dexterity);
  const base = 10 + dex;
  const cls = (className ?? "").toLowerCase();
  if (cls === "barbarian") {
    return { base, unarmoredLabel: "Barbarian Unarmored", unarmoredValue: 10 + dex + abilityModifier(final.constitution) };
  }
  if (cls === "monk") {
    return { base, unarmoredLabel: "Monk Unarmored", unarmoredValue: 10 + dex + abilityModifier(final.wisdom) };
  }
  return { base };
}

// ── Cover (2024): bonus to AC and Dex saving throws; only the best degree applies ──
export const COVER_OPTIONS = [
  { value: "none", label: "No cover" },
  { value: "half", label: "Half (+2)" },
  { value: "three_quarters", label: "Three-quarters (+5)" },
  { value: "total", label: "Total (can't be targeted)" },
] as const;

export function coverAcBonus(cover: string): number {
  if (cover === "half") return 2;
  if (cover === "three_quarters") return 5;
  return 0; // 'none'; 'total' can't be targeted at all (handled separately)
}

// ── Damage typing & mitigation ───────────────────────────────────────────────
export const DAMAGE_TYPES = [
  "Acid", "Bludgeoning", "Cold", "Fire", "Force", "Lightning", "Necrotic",
  "Piercing", "Poison", "Psychic", "Radiant", "Slashing", "Thunder",
] as const;

export interface DamageDefenses {
  damage_resistances: string[];
  damage_immunities: string[];
  damage_vulnerabilities: string[];
}

// Apply a creature's resistance/immunity/vulnerability to a raw damage amount,
// per 2024 rules: immunity → 0, resistance → halved (round down), vulnerability → doubled.
// Resistance and vulnerability to the same type cancel (net no change); immunity wins.
export function applyDamageMitigation(
  defenses: DamageDefenses,
  type: string | null,
  amount: number,
): number {
  if (amount <= 0 || !type) return Math.max(0, amount);
  const t = type.toLowerCase();
  const has = (list: string[]) => list.some((x) => x.toLowerCase() === t);
  if (has(defenses.damage_immunities)) return 0;
  const resist = has(defenses.damage_resistances);
  const vuln = has(defenses.damage_vulnerabilities);
  if (resist && !vuln) return Math.floor(amount / 2);
  if (vuln && !resist) return amount * 2;
  return amount;
}

// Concentration save DC when taking damage: 10 or half the damage, whichever is
// higher, capped at 30.
export function concentrationDC(damageTaken: number): number {
  return Math.min(30, Math.max(10, Math.floor(damageTaken / 2)));
}

export interface DeathSaveResult {
  successesDelta: number;
  failuresDelta: number;
  regainsConsciousness: boolean; // natural 20 → 1 HP
  reset: boolean;                // clear the track (stable or revived)
}

// Resolve a death-saving-throw d20: nat 20 → regain 1 HP (reset); nat 1 → 2
// failures; 10+ → success; else failure.
export function resolveDeathSave(d20: number): DeathSaveResult {
  if (d20 >= 20) return { successesDelta: 0, failuresDelta: 0, regainsConsciousness: true, reset: true };
  if (d20 <= 1) return { successesDelta: 0, failuresDelta: 2, regainsConsciousness: false, reset: false };
  if (d20 >= 10) return { successesDelta: 1, failuresDelta: 0, regainsConsciousness: false, reset: false };
  return { successesDelta: 0, failuresDelta: 1, regainsConsciousness: false, reset: false };
}

// ── Armor-based AC (from the seeded srd_armor table) ──────────────────────────
export interface ArmorItem {
  name: string;
  category: "light" | "medium" | "heavy" | "shield";
  base_ac: number;
  add_dex: boolean;
  max_dex: number | null;
  strength_req: number;
  stealth_disadvantage: boolean;
  weight: number;
}

export interface ComputedAC {
  ac: number;
  label: string;
  stealthDisadvantage: boolean;
  strengthShortfall: number; // >0 = STR below the armor's requirement (heavy armor: −10 ft speed)
}

// AC from equipped armor: body armor base + capped Dex, plus shield; falls back
// to Unarmored Defense (10 + DEX, or Barbarian/Monk variants) when no body armor.
export function computeArmorAC(
  equipped: ArmorItem[],
  final: AbilityScores,
  className: string,
): ComputedAC {
  const dex = abilityModifier(final.dexterity);
  const body = equipped.find((a) => a.category !== "shield");
  const shield = equipped.find((a) => a.category === "shield");
  const shieldBonus = shield ? shield.base_ac : 0;

  let base: number;
  let label: string;
  let stealth = false;
  let strShortfall = 0;

  if (body) {
    const dexPart = body.add_dex
      ? body.max_dex != null ? Math.min(dex, body.max_dex) : dex
      : 0;
    base = body.base_ac + dexPart;
    label = body.name;
    stealth = body.stealth_disadvantage;
    if (body.strength_req > 0 && final.strength < body.strength_req) {
      strShortfall = body.strength_req - final.strength;
    }
  } else {
    const sug = suggestedAC(final, className);
    base = sug.unarmoredValue ?? sug.base;
    label = sug.unarmoredLabel ?? "Unarmored";
  }

  return {
    ac: base + shieldBonus,
    label: shield ? `${label} + Shield` : label,
    stealthDisadvantage: stealth,
    strengthShortfall: strShortfall,
  };
}

// ── Aggregate active conditions into the net effect on a creature's d20 rolls ──
export interface AggregatedConditionEffects {
  attackAdjust: "advantage" | "disadvantage" | "none";
  abilityCheckDisadvantage: boolean;
  dexSaveDisadvantage: boolean;
  autoFailStrDexSaves: boolean;
  incapacitated: boolean;
  notes: { condition: string; note: string }[];
}

export function aggregateConditions(conditions: string[]): AggregatedConditionEffects {
  let attackAdv = false;
  let attackDis = false;
  let abilityCheckDis = false;
  let dexSaveDis = false;
  let autoFail = false;
  let incap = false;
  const notes: { condition: string; note: string }[] = [];

  for (const c of conditions) {
    const e = CONDITION_EFFECTS[c];
    if (!e) continue;
    if (e.attackAdvantage) attackAdv = true;
    if (e.attackDisadvantage) attackDis = true;
    if (e.abilityCheckDisadvantage) abilityCheckDis = true;
    if (e.dexSaveDisadvantage) dexSaveDis = true;
    if (e.autoFailStrDexSaves) autoFail = true;
    if (e.incapacitated) incap = true;
    notes.push({ condition: c, note: e.note });
  }

  // 5e rule: advantage and disadvantage from any sources cancel to a flat roll.
  const attackAdjust = attackAdv && attackDis
    ? "none"
    : attackAdv
      ? "advantage"
      : attackDis
        ? "disadvantage"
        : "none";

  return {
    attackAdjust,
    abilityCheckDisadvantage: abilityCheckDis,
    dexSaveDisadvantage: dexSaveDis,
    autoFailStrDexSaves: autoFail,
    incapacitated: incap,
    notes,
  };
}

// ── Weapon mastery (2024) ─────────────────────────────────────────────────────
// Each weapon has a mastery property usable only with a feature (e.g. Weapon
// Mastery). Effect text transcribed verbatim from docs/rules/equipment.md.
export const MASTERY_PROPERTIES = [
  "Cleave", "Graze", "Nick", "Push", "Sap", "Slow", "Topple", "Vex",
] as const;
export type MasteryProperty = (typeof MASTERY_PROPERTIES)[number];

export const MASTERY_INFO: Record<MasteryProperty, string> = {
  Cleave:
    "On a hit with a melee attack, make an attack against a second creature within 5 ft of the first and within reach. The second takes the weapon's damage (no ability modifier unless negative). Once per turn.",
  Graze:
    "On a miss, deal damage to the target equal to the ability modifier used for the attack (same damage type).",
  Nick:
    "When you make the extra attack of the Light property, you can make it as part of the Attack action instead of as a Bonus Action. Once per turn.",
  Push: "On a hit, push the creature up to 10 ft straight away if it is Large or smaller.",
  Sap: "On a hit, the creature has Disadvantage on its next attack roll before the start of your next turn.",
  Slow:
    "On a hit that deals damage, reduce the creature's Speed by 10 ft until the start of your next turn.",
  Topple:
    "On a hit, the creature makes a Constitution save (DC 8 + ability modifier + proficiency bonus) or is knocked Prone.",
  Vex:
    "On a hit that deals damage, you have Advantage on your next attack roll against that creature before the end of your next turn.",
};

// Weapon name (lowercased) → mastery property, from the 2024 weapon table.
// Used to auto-fill mastery when a weapon is picked from search.
export const WEAPON_MASTERY: Record<string, MasteryProperty> = {
  // Simple melee
  club: "Slow",
  dagger: "Nick",
  greatclub: "Push",
  handaxe: "Vex",
  javelin: "Slow",
  "light hammer": "Nick",
  mace: "Sap",
  quarterstaff: "Topple",
  sickle: "Nick",
  spear: "Sap",
  // Simple ranged
  dart: "Vex",
  "light crossbow": "Slow",
  shortbow: "Vex",
  sling: "Slow",
  // Martial melee
  battleaxe: "Topple",
  flail: "Sap",
  glaive: "Graze",
  greataxe: "Cleave",
  greatsword: "Graze",
  halberd: "Cleave",
  lance: "Topple",
  longsword: "Sap",
  maul: "Topple",
  morningstar: "Sap",
  pike: "Push",
  rapier: "Vex",
  scimitar: "Nick",
  shortsword: "Vex",
  trident: "Topple",
  warhammer: "Push",
  "war pick": "Sap",
  whip: "Slow",
  // Martial ranged
  blowgun: "Vex",
  "hand crossbow": "Vex",
  "heavy crossbow": "Push",
  longbow: "Slow",
  musket: "Slow",
  pistol: "Vex",
};
