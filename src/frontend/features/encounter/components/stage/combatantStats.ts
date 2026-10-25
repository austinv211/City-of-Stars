import {
  abilityModifier,
  finalAbilityScores,
  deriveStats,
  cantripDiceMultiplier,
  computeAttackRoll,
} from "@/features/characters/types/character.types";
import {
  CLASSES,
  resolveSpellcastingAbility,
} from "@/features/characters/data/dnd2024.constants";
import {
  aggregateConditions,
  exhaustionD20Penalty,
  hasJackOfAllTrades,
  halfProficiencyBonus,
  type AggregatedConditionEffects,
} from "@/features/characters/data/rules2024";
import type {
  AbilityName,
  CharacterAttack,
  CharacterWithScores,
} from "@/features/characters/types/character.types";
import type { EncounterParticipant } from "../../types/encounter.types";
import { SKILL_ABILITY } from "./actionCatalog";

export const ABILITIES: AbilityName[] = [
  "strength",
  "dexterity",
  "constitution",
  "intelligence",
  "wisdom",
  "charisma",
];

export interface CombatantStats {
  mods: Record<AbilityName, number>;
  profBonus: number;
  savingThrowProfs: AbilityName[];
  /** Resolves the class default when the sheet leaves it unset. */
  spellAtkMod: number;
  /** Cantrip dice scale with character level; 1 for NPCs. */
  cantripMult: number;
  condEffects: AggregatedConditionEffects;
  exhaustionLevel: number;
  /** <= 0, applied to every d20 test. */
  exhaustPenalty: number;
  /** Jack of All Trades: half proficiency on raw ability checks (Bard 2+). */
  joatBonus: number;
  attackOpts: { advantage: boolean; disadvantage: boolean };
  skillMod: (skill: string) => number;
  saveMod: (ability: AbilityName) => number;
  /**
   * Attack and damage modifiers recomputed live from the character, so they
   * survive level-ups and ability changes. NPCs (no sheet) use the stored values.
   */
  attackRoll: (atk: CharacterAttack) => {
    attackMod: number;
    damageMod: number;
    diceCount: number;
  };
}

interface Scores {
  scores: Record<AbilityName, number>;
  profBonus: number;
  savingThrowProfs: AbilityName[];
}

function npcScores(p: EncounterParticipant): Scores {
  return {
    scores: {
      strength: p.str_score ?? 10,
      dexterity: p.dex_score ?? 10,
      constitution: p.con_score ?? 10,
      intelligence: p.int_score ?? 10,
      wisdom: p.wis_score ?? 10,
      charisma: p.cha_score ?? 10,
    },
    profBonus: 2,
    savingThrowProfs: [],
  };
}

function playerScores(character: CharacterWithScores): Scores | null {
  const base = character.ability_scores;
  if (!base) return null;
  const final = finalAbilityScores(
    base,
    base.background_bonus_primary,
    base.background_bonus_secondary,
  );
  const classProfs =
    CLASSES.find((c) => c.name === character.class)?.savingThrows ?? [];
  const charProfs = character.saving_throw_proficiencies as AbilityName[];
  return {
    scores: final,
    profBonus: deriveStats(final, character.level).proficiencyBonus,
    savingThrowProfs: [...new Set([...classProfs, ...charProfs])],
  };
}

/**
 * Every number the action panel shows for one combatant: ability and save
 * modifiers, proficiency, spell attack, and the 2024 condition and exhaustion
 * effects that auto-apply to d20 tests.
 *
 * Players use their character sheet; NPCs use the scores stored on the row.
 */
export function combatantStats(
  participant: EncounterParticipant,
  character: CharacterWithScores | null,
): CombatantStats {
  const fromSheet = participant.is_player && character ? playerScores(character) : null;
  const { scores, profBonus, savingThrowProfs } = fromSheet ?? npcScores(participant);
  const mods = Object.fromEntries(
    ABILITIES.map((a) => [a, abilityModifier(scores[a])]),
  ) as Record<AbilityName, number>;

  const spellAbility = character
    ? resolveSpellcastingAbility(character.class, character.spellcasting_ability)
    : null;
  const condEffects = aggregateConditions(participant.conditions);
  // Exhaustion is snapshotted onto the participant by the
  // sync_character_to_participants trigger, so it is reliable here.
  const exhaustionLevel = participant.exhaustion;

  return {
    mods,
    profBonus,
    savingThrowProfs,
    spellAtkMod: (spellAbility ? mods[spellAbility] : 0) + profBonus,
    cantripMult: character ? cantripDiceMultiplier(character.level) : 1,
    condEffects,
    exhaustionLevel,
    exhaustPenalty: exhaustionD20Penalty(exhaustionLevel),
    joatBonus:
      participant.is_player &&
      character &&
      hasJackOfAllTrades(character.class, character.level)
        ? halfProficiencyBonus(profBonus)
        : 0,
    attackOpts: {
      advantage: condEffects.attackAdjust === "advantage",
      disadvantage: condEffects.attackAdjust === "disadvantage",
    },
    skillMod(skill) {
      const abilityMod = mods[SKILL_ABILITY[skill] ?? "strength"];
      if (!participant.is_player) return abilityMod;
      const prof = character?.proficiencies.find((p) => p.skill === skill);
      if (!prof) return abilityMod;
      return abilityMod + profBonus * (prof.is_expertise ? 2 : 1);
    },
    saveMod(ability) {
      const base = mods[ability];
      if (!participant.is_player) return base;
      return savingThrowProfs.includes(ability) ? base + profBonus : base;
    },
    attackRoll(atk) {
      if (!participant.is_player || !character?.ability_scores) {
        return {
          attackMod: atk.attack_modifier,
          damageMod: atk.damage_modifier,
          diceCount: atk.dice_count,
        };
      }
      return computeAttackRoll(character, atk);
    },
  };
}

export const sign = (n: number) => (n >= 0 ? `+${n}` : String(n));

/** "2d6+3" -> { count: 2, sides: 6, mod: 3 }; tolerant of missing parts. */
export function parseDamageDice(dice: string): {
  count: number;
  sides: number;
  mod: number;
} {
  const [countStr = "", rest = "6"] = dice.split("d");
  const [sidesStr = "", modStr = ""] = rest.split(/[+-]/);
  const magnitude = parseInt(modStr) || 0;
  const mod = dice.includes("+") ? magnitude : dice.includes("-") ? -magnitude : 0;
  return { count: parseInt(countStr) || 1, sides: parseInt(sidesStr) || 6, mod };
}
