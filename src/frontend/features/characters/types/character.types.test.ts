import { describe, expect, it } from "vitest";
import {
  abilityModifier,
  computeAttackRoll,
  deriveStats,
  finalAbilityScores,
  passiveScore,
  skillBonus,
  type AbilityScores,
  type CharacterProficiency,
  type CharacterWithScores,
} from "./character.types";

const scores = (over: Partial<AbilityScores> = {}): AbilityScores => ({
  strength: 10,
  dexterity: 10,
  constitution: 10,
  intelligence: 10,
  wisdom: 10,
  charisma: 10,
  ...over,
});

const prof = (
  skill: string,
  is_expertise = false,
): Pick<CharacterProficiency, "skill" | "is_expertise"> => ({ skill, is_expertise });

describe("abilityModifier", () => {
  it("is floor((score - 10) / 2)", () => {
    expect(abilityModifier(10)).toBe(0);
    expect(abilityModifier(11)).toBe(0);
    expect(abilityModifier(12)).toBe(1);
    expect(abilityModifier(20)).toBe(5);
    expect(abilityModifier(30)).toBe(10);
  });

  it("goes negative below 10, rounding down not toward zero", () => {
    expect(abilityModifier(9)).toBe(-1);
    expect(abilityModifier(8)).toBe(-1);
    expect(abilityModifier(7)).toBe(-2);
    expect(abilityModifier(1)).toBe(-5);
  });
});

describe("deriveStats", () => {
  it("steps the proficiency bonus every four levels", () => {
    const pb = (level: number) => deriveStats(scores(), level).proficiencyBonus;
    expect(pb(1)).toBe(2);
    expect(pb(4)).toBe(2);
    expect(pb(5)).toBe(3);
    expect(pb(8)).toBe(3);
    expect(pb(9)).toBe(4);
    expect(pb(13)).toBe(5);
    expect(pb(17)).toBe(6);
    expect(pb(20)).toBe(6);
  });

  it("takes initiative from DEX", () => {
    expect(deriveStats(scores({ dexterity: 18 }), 1).initiative).toBe(4);
  });
});

describe("finalAbilityScores", () => {
  it("applies the 2024 background bonuses: +2 primary, +1 secondary", () => {
    const final = finalAbilityScores(scores(), "strength", "dexterity");
    expect(final.strength).toBe(12);
    expect(final.dexterity).toBe(11);
    expect(final.constitution).toBe(10);
  });

  it("leaves scores untouched when no background is chosen", () => {
    expect(finalAbilityScores(scores(), null, null)).toEqual(scores());
  });

  it("does not mutate the input", () => {
    const base = scores();
    finalAbilityScores(base, "strength", "dexterity");
    expect(base.strength).toBe(10);
  });

  // The 2024 background rules give +2/+1 to two DIFFERENT abilities (or +1 to
  // three). The same ability cannot receive both, but nothing stopped the
  // caller passing the same one twice, which silently produced +3.
  it("never grants more than +2 to a single ability", () => {
    const final = finalAbilityScores(scores(), "strength", "strength");
    expect(final.strength).toBe(12);
  });
});

describe("skillBonus", () => {
  it("is the governing ability modifier when not proficient", () => {
    expect(skillBonus(scores({ dexterity: 16 }), 3, "Acrobatics", [])).toBe(3);
  });

  it("adds the proficiency bonus when proficient", () => {
    expect(
      skillBonus(scores({ dexterity: 16 }), 3, "Acrobatics", [prof("Acrobatics")]),
    ).toBe(6);
  });

  it("doubles the proficiency bonus for expertise", () => {
    expect(
      skillBonus(scores({ dexterity: 16 }), 3, "Acrobatics", [prof("Acrobatics", true)]),
    ).toBe(9);
  });

  it("applies half proficiency only when NOT already proficient", () => {
    const s = scores({ dexterity: 16 });
    // Jack of All Trades: half of 3 is 1.
    expect(skillBonus(s, 3, "Acrobatics", [], true)).toBe(4);
    // Already proficient -- half proficiency must not stack on top.
    expect(skillBonus(s, 3, "Acrobatics", [prof("Acrobatics")], true)).toBe(6);
  });

  it("falls back to no ability modifier for an unknown skill", () => {
    expect(skillBonus(scores({ dexterity: 20 }), 3, "Basket Weaving", [])).toBe(0);
  });
});

describe("passiveScore", () => {
  it("is 10 + the skill bonus", () => {
    expect(
      passiveScore(scores({ wisdom: 14 }), 2, "Perception", [prof("Perception")]),
    ).toBe(14);
  });
});

describe("computeAttackRoll", () => {
  const character = (over: Partial<CharacterWithScores> = {}): CharacterWithScores =>
    ({
      level: 5, // proficiency bonus 3
      class: "Fighter",
      spellcasting_ability: null,
      ability_scores: {
        ...scores({ strength: 18, dexterity: 14 }),
        background_bonus_primary: null,
        background_bonus_secondary: null,
      },
      ...over,
    }) as CharacterWithScores;

  const attack = (over = {}) => ({
    attack_modifier: 0,
    damage_modifier: 0,
    dice_count: 1,
    is_ranged: false,
    is_spell: false,
    is_finesse: false,
    is_thrown: false,
    ...over,
  });

  it("uses STR for a plain melee weapon", () => {
    const r = computeAttackRoll(character(), attack());
    expect(r.attackMod).toBe(7); // +4 STR + 3 proficiency
    expect(r.damageMod).toBe(4);
  });

  it("uses DEX for a ranged weapon", () => {
    const r = computeAttackRoll(character(), attack({ is_ranged: true }));
    expect(r.attackMod).toBe(5); // +2 DEX + 3
  });

  it("uses the higher of STR/DEX for finesse", () => {
    const strong = computeAttackRoll(character(), attack({ is_finesse: true }));
    expect(strong.damageMod).toBe(4); // STR 18 beats DEX 14

    const nimble = computeAttackRoll(
      character({
        ability_scores: {
          ...scores({ strength: 10, dexterity: 18 }),
          background_bonus_primary: null,
          background_bonus_secondary: null,
        },
      } as Partial<CharacterWithScores>),
      attack({ is_finesse: true }),
    );
    expect(nimble.damageMod).toBe(4); // DEX 18 beats STR 10
  });

  // A thrown weapon is used at range but still keys off STR -- the combination
  // is_ranged && is_thrown is the one that trips people up.
  it("uses STR for a thrown weapon despite being ranged", () => {
    const r = computeAttackRoll(
      character(),
      attack({ is_ranged: true, is_thrown: true }),
    );
    expect(r.damageMod).toBe(4); // STR, not DEX
  });

  it("uses the spellcasting ability and keeps the attack's own damage modifier", () => {
    const r = computeAttackRoll(
      character({
        class: "Wizard",
        spellcasting_ability: "intelligence",
        ability_scores: {
          ...scores({ intelligence: 18 }),
          background_bonus_primary: null,
          background_bonus_secondary: null,
        },
      } as Partial<CharacterWithScores>),
      attack({ is_spell: true, damage_modifier: 2 }),
    );
    expect(r.attackMod).toBe(7); // +4 INT + 3 proficiency
    expect(r.damageMod).toBe(2); // spells do not add the ability mod here
  });

  it("folds background bonuses into the attack maths", () => {
    const r = computeAttackRoll(
      character({
        ability_scores: {
          ...scores({ strength: 17 }),
          background_bonus_primary: "strength", // 17 -> 18, mod +3 -> +4
          background_bonus_secondary: null,
        },
      } as Partial<CharacterWithScores>),
      attack(),
    );
    expect(r.damageMod).toBe(4);
  });

  it("falls back to the stored modifiers when the character has no scores", () => {
    const r = computeAttackRoll(
      character({ ability_scores: null }),
      attack({ attack_modifier: 9, damage_modifier: 5, dice_count: 2 }),
    );
    expect(r).toEqual({ attackMod: 9, damageMod: 5, diceCount: 2 });
  });
});
