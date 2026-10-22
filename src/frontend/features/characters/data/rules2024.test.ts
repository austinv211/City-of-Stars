import { describe, expect, it } from "vitest";
import {
  aggregateConditions,
  applyDamageMitigation,
  carryingCapacity,
  concentrationDC,
  coverAcBonus,
  exhaustionD20Penalty,
  exhaustionSpeedPenalty,
  halfProficiencyBonus,
  hasJackOfAllTrades,
  resolveDeathSave,
  suggestedAC,
  type DamageDefenses,
} from "./rules2024";
import type { AbilityScores } from "../types/character.types";

const defenses = (d: Partial<DamageDefenses> = {}): DamageDefenses => ({
  damage_resistances: [],
  damage_immunities: [],
  damage_vulnerabilities: [],
  ...d,
});

const scores = (over: Partial<AbilityScores> = {}): AbilityScores => ({
  strength: 10,
  dexterity: 10,
  constitution: 10,
  intelligence: 10,
  wisdom: 10,
  charisma: 10,
  ...over,
});

describe("applyDamageMitigation", () => {
  it("passes damage through with no defenses", () => {
    expect(applyDamageMitigation(defenses(), "Fire", 10)).toBe(10);
  });

  it("halves for resistance, rounding down", () => {
    const d = defenses({ damage_resistances: ["Fire"] });
    expect(applyDamageMitigation(d, "Fire", 10)).toBe(5);
    expect(applyDamageMitigation(d, "Fire", 7)).toBe(3); // 3.5 -> 3
    expect(applyDamageMitigation(d, "Fire", 1)).toBe(0); // 0.5 -> 0
  });

  it("doubles for vulnerability", () => {
    expect(
      applyDamageMitigation(defenses({ damage_vulnerabilities: ["Cold"] }), "Cold", 7),
    ).toBe(14);
  });

  it("matches damage type case-insensitively", () => {
    expect(
      applyDamageMitigation(defenses({ damage_resistances: ["fire"] }), "FIRE", 10),
    ).toBe(5);
  });

  it("only applies the defense matching the damage type", () => {
    const d = defenses({ damage_resistances: ["Fire"] });
    expect(applyDamageMitigation(d, "Cold", 10)).toBe(10);
  });

  // Ordering is the part that is easy to get wrong: immunity has to win
  // outright rather than being halved or doubled first.
  it("immunity beats resistance and vulnerability", () => {
    const d = defenses({
      damage_immunities: ["Fire"],
      damage_resistances: ["Fire"],
      damage_vulnerabilities: ["Fire"],
    });
    expect(applyDamageMitigation(d, "Fire", 10)).toBe(0);
  });

  it("resistance and vulnerability to the same type cancel", () => {
    const d = defenses({
      damage_resistances: ["Fire"],
      damage_vulnerabilities: ["Fire"],
    });
    expect(applyDamageMitigation(d, "Fire", 10)).toBe(10);
  });

  it("returns 0 for non-positive damage, and never a negative", () => {
    expect(applyDamageMitigation(defenses(), "Fire", 0)).toBe(0);
    expect(applyDamageMitigation(defenses(), "Fire", -5)).toBe(0);
  });

  it("passes damage through untyped", () => {
    expect(
      applyDamageMitigation(defenses({ damage_immunities: ["Fire"] }), null, 10),
    ).toBe(10);
  });
});

describe("concentrationDC", () => {
  it("floors at 10 for small hits", () => {
    expect(concentrationDC(1)).toBe(10);
    expect(concentrationDC(19)).toBe(10); // 9 -> floor is 10
  });

  it("switches to half damage at 20", () => {
    expect(concentrationDC(20)).toBe(10);
    expect(concentrationDC(21)).toBe(10); // 10.5 -> 10
    expect(concentrationDC(22)).toBe(11);
  });

  it("caps at 30", () => {
    expect(concentrationDC(60)).toBe(30);
    expect(concentrationDC(200)).toBe(30);
  });
});

describe("resolveDeathSave", () => {
  it("natural 20 regains consciousness and clears the track", () => {
    expect(resolveDeathSave(20)).toEqual({
      successesDelta: 0,
      failuresDelta: 0,
      regainsConsciousness: true,
      reset: true,
    });
  });

  it("natural 1 counts as TWO failures", () => {
    expect(resolveDeathSave(1).failuresDelta).toBe(2);
  });

  it("10 or higher succeeds, 9 or lower fails", () => {
    expect(resolveDeathSave(10).successesDelta).toBe(1);
    expect(resolveDeathSave(19).successesDelta).toBe(1);
    expect(resolveDeathSave(9).failuresDelta).toBe(1);
    expect(resolveDeathSave(2).failuresDelta).toBe(1);
  });
});

describe("exhaustion", () => {
  it("applies -2 per level to d20 tests and -5 ft speed", () => {
    expect(exhaustionD20Penalty(0)).toBe(0);
    expect(exhaustionD20Penalty(1)).toBe(-2);
    expect(exhaustionD20Penalty(5)).toBe(-10);
    expect(exhaustionSpeedPenalty(3)).toBe(-15);
  });

  it("clamps to the 0-6 range", () => {
    expect(exhaustionD20Penalty(6)).toBe(-12);
    expect(exhaustionD20Penalty(99)).toBe(-12);
    expect(exhaustionD20Penalty(-3)).toBe(0);
  });
});

describe("coverAcBonus", () => {
  it("gives +2 for half and +5 for three-quarters", () => {
    expect(coverAcBonus("half")).toBe(2);
    expect(coverAcBonus("three_quarters")).toBe(5);
  });

  it("gives nothing for no cover", () => {
    expect(coverAcBonus("none")).toBe(0);
    expect(coverAcBonus("")).toBe(0);
  });

  // Total cover means "cannot be targeted at all", which is not an AC bonus --
  // so 0 is the right return value here. The source comment says this is
  // "handled separately". It is NOT: a search for cover === "total" finds only
  // ParticipantCard.tsx:104, which prints the words "Total cover" and nothing
  // more. No attack flow consults it.
  //
  // So in practice a creature in total cover is treated as having no cover.
  // This test pins the function's own contract (0 is correct) and documents
  // the real gap, which lives in the attack resolution the Phase 3 encounter
  // redesign builds -- see canBeTargeted below.
  it("returns 0 for total cover, which is an AC bonus of nothing", () => {
    expect(coverAcBonus("total")).toBe(0);
  });
});

describe("carryingCapacity", () => {
  it("is strength x 15 for Small and Medium", () => {
    expect(carryingCapacity(10)).toBe(150);
    expect(carryingCapacity(15, "Small")).toBe(225);
  });

  it("scales by size", () => {
    expect(carryingCapacity(10, "Tiny")).toBe(75);
    expect(carryingCapacity(10, "Large")).toBe(300);
    expect(carryingCapacity(10, "Gargantuan")).toBe(1200);
  });

  it("treats an unknown size as x1", () => {
    expect(carryingCapacity(10, "Enormous")).toBe(150);
  });
});

describe("Jack of All Trades", () => {
  it("applies to bards from level 2", () => {
    expect(hasJackOfAllTrades("Bard", 2)).toBe(true);
    expect(hasJackOfAllTrades("bard", 20)).toBe(true);
    expect(hasJackOfAllTrades("Bard", 1)).toBe(false);
    expect(hasJackOfAllTrades("Rogue", 5)).toBe(false);
  });

  it("adds half proficiency, rounded down", () => {
    expect(halfProficiencyBonus(2)).toBe(1);
    expect(halfProficiencyBonus(3)).toBe(1);
    expect(halfProficiencyBonus(6)).toBe(3);
  });
});

describe("suggestedAC", () => {
  it("is 10 + DEX for most classes", () => {
    expect(suggestedAC(scores({ dexterity: 16 }), "Fighter")).toEqual({ base: 13 });
  });

  it("offers Unarmored Defense for barbarians (DEX + CON)", () => {
    const ac = suggestedAC(scores({ dexterity: 14, constitution: 16 }), "Barbarian");
    expect(ac.base).toBe(12);
    expect(ac.unarmoredValue).toBe(15);
    expect(ac.unarmoredLabel).toBe("Barbarian Unarmored");
  });

  it("offers Unarmored Defense for monks (DEX + WIS)", () => {
    const ac = suggestedAC(scores({ dexterity: 14, wisdom: 18 }), "Monk");
    expect(ac.unarmoredValue).toBe(16);
  });
});

describe("aggregateConditions", () => {
  it("returns a clean slate for no conditions", () => {
    const a = aggregateConditions([]);
    expect(a.attackAdjust).toBe("none");
    expect(a.incapacitated).toBe(false);
    expect(a.notes).toEqual([]);
  });

  it("ignores conditions it does not know", () => {
    expect(aggregateConditions(["Bewildered"]).notes).toEqual([]);
  });

  it("carries the incapacitated flag through compound conditions", () => {
    expect(aggregateConditions(["Stunned"]).incapacitated).toBe(true);
    expect(aggregateConditions(["Paralyzed"]).incapacitated).toBe(true);
    expect(aggregateConditions(["Prone"]).incapacitated).toBe(false);
  });

  it("auto-fails STR/DEX saves while paralyzed or unconscious", () => {
    expect(aggregateConditions(["Paralyzed"]).autoFailStrDexSaves).toBe(true);
    expect(aggregateConditions(["Unconscious"]).autoFailStrDexSaves).toBe(true);
    expect(aggregateConditions(["Poisoned"]).autoFailStrDexSaves).toBe(false);
  });

  it("gives disadvantage on ability checks while poisoned", () => {
    expect(aggregateConditions(["Poisoned"]).abilityCheckDisadvantage).toBe(true);
  });

  // The rule that is easiest to get wrong: advantage and disadvantage from ANY
  // number of sources cancel to a flat roll -- they do not accumulate.
  it("cancels advantage against disadvantage rather than stacking", () => {
    expect(aggregateConditions(["Invisible"]).attackAdjust).toBe("advantage");
    expect(aggregateConditions(["Poisoned"]).attackAdjust).toBe("disadvantage");
    expect(aggregateConditions(["Invisible", "Poisoned"]).attackAdjust).toBe("none");
    // Two sources of disadvantage against one of advantage still cancels.
    expect(
      aggregateConditions(["Invisible", "Poisoned", "Frightened"]).attackAdjust,
    ).toBe("none");
  });

  it("attributes each note to the condition that produced it", () => {
    const notes = aggregateConditions(["Prone", "Poisoned"]).notes;
    expect(notes.map((n) => n.condition)).toEqual(["Prone", "Poisoned"]);
  });

  // `characters.conditions` is a text[] with no uniqueness constraint, and the
  // participant/character dual-write means the same condition can land twice.
  // A repeated condition must not produce a repeated note.
  it("does not repeat a note when a condition appears twice", () => {
    expect(aggregateConditions(["Prone", "Prone"]).notes).toHaveLength(1);
  });
});
