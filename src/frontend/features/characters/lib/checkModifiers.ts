import { SKILLS } from "../data/dnd2024.constants";
import { exhaustionD20Penalty, halfProficiencyBonus } from "../data/rules2024";
import { abilityModifier, skillBonus } from "../types/character.types";
import type {
  AbilityName,
  AbilityScores,
  CharacterProficiency,
} from "../types/character.types";

/**
 * The modifier on every d20 test a character can make from their sheet, out
 * of combat: raw ability checks, saving throws and skill checks. The same
 * rules the encounter's check buttons apply, so a Perception check reads the
 * same number at the table and in a fight.
 *
 *   ability check  mod + Jack of All Trades (half proficiency, Bard 2+)
 *   saving throw   mod + proficiency if proficient (JoaT does not apply)
 *   skill check    skillBonus (proficiency / expertise / JoaT)
 *
 * Exhaustion's -2 per level applies to every d20 test (2024).
 */

export type RollMode = "normal" | "advantage" | "disadvantage";

export type SkillProficiency = "expert" | "proficient" | "none";

export interface SkillCheck {
  name: string;
  ability: AbilityName;
  mod: number;
  proficiency: SkillProficiency;
}

export interface CheckModifiers {
  abilities: Record<AbilityName, number>;
  saves: Record<AbilityName, { mod: number; proficient: boolean }>;
  /** Expertise first, then proficient, then the rest; alphabetical within. */
  skills: SkillCheck[];
}

export const ABILITY_ORDER: AbilityName[] = [
  "strength",
  "dexterity",
  "constitution",
  "intelligence",
  "wisdom",
  "charisma",
];

const RANK: Record<SkillProficiency, number> = { expert: 0, proficient: 1, none: 2 };

export function checkModifiers(input: {
  final: AbilityScores;
  proficiencyBonus: number;
  savingThrowProficiencies: readonly string[];
  proficiencies: readonly Pick<CharacterProficiency, "skill" | "is_expertise">[];
  jackOfAllTrades: boolean;
  exhaustion: number;
}): CheckModifiers {
  const { final, proficiencyBonus, proficiencies, jackOfAllTrades } = input;
  const d20 = exhaustionD20Penalty(input.exhaustion);
  const joat = jackOfAllTrades ? halfProficiencyBonus(proficiencyBonus) : 0;

  const abilities = {} as CheckModifiers["abilities"];
  const saves = {} as CheckModifiers["saves"];
  for (const a of ABILITY_ORDER) {
    const mod = abilityModifier(final[a]);
    const proficient = input.savingThrowProficiencies.includes(a);
    abilities[a] = mod + joat + d20;
    saves[a] = { mod: mod + (proficient ? proficiencyBonus : 0) + d20, proficient };
  }

  const skills = SKILLS.map((s): SkillCheck => {
    const prof = proficiencies.find((p) => p.skill === s.name);
    return {
      name: s.name,
      ability: s.ability,
      mod:
        skillBonus(final, proficiencyBonus, s.name, proficiencies, jackOfAllTrades) +
        d20,
      proficiency: prof ? (prof.is_expertise ? "expert" : "proficient") : "none",
    };
  }).sort(
    (a, b) => RANK[a.proficiency] - RANK[b.proficiency] || a.name.localeCompare(b.name),
  );

  return { abilities, saves, skills };
}
