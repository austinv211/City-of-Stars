import { finalAbilityScores } from "@/features/characters/types/character.types";
import type { Character, CharacterAbilityScores } from "@/features/characters/types/character.types";

/** Combat state seeded from the sheet; the sync trigger keeps it current. */
export const SNAPSHOT_COLUMNS = [
  "conditions",
  "damage_resistances",
  "damage_immunities",
  "damage_vulnerabilities",
  "concentrating_on",
  "death_save_successes",
  "death_save_failures",
  "exhaustion",
] as const;
export type CombatSnapshot = Pick<Character, (typeof SNAPSHOT_COLUMNS)[number]>;
export const NO_SNAPSHOT: CombatSnapshot = {
  conditions: [],
  damage_resistances: [],
  damage_immunities: [],
  damage_vulnerabilities: [],
  concentrating_on: null,
  death_save_successes: 0,
  death_save_failures: 0,
  exhaustion: 0,
};

/** Final ability scores onto the participant, so stat-based rolls need no lookup. */
export function scoreColumns(s: CharacterAbilityScores | undefined) {
  const f = s ? finalAbilityScores(s, s.background_bonus_primary, s.background_bonus_secondary) : null;
  return {
    str_score: f?.strength ?? null,
    dex_score: f?.dexterity ?? null,
    con_score: f?.constitution ?? null,
    int_score: f?.intelligence ?? null,
    wis_score: f?.wisdom ?? null,
    cha_score: f?.charisma ?? null,
  };
}
