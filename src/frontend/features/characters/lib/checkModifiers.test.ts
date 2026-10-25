import { describe, expect, it } from "vitest";
import { checkModifiers } from "./checkModifiers";

const final = {
  strength: 16, // +3
  dexterity: 14, // +2
  constitution: 12, // +1
  intelligence: 10, // +0
  wisdom: 13, // +1
  charisma: 8, // -1
};

const base = {
  final,
  proficiencyBonus: 3,
  savingThrowProficiencies: ["strength", "constitution"],
  proficiencies: [
    { skill: "Athletics", is_expertise: false },
    { skill: "Stealth", is_expertise: true },
  ],
  jackOfAllTrades: false,
  exhaustion: 0,
};

describe("checkModifiers", () => {
  it("adds proficiency to proficient saves only", () => {
    const { saves } = checkModifiers(base);
    expect(saves.strength).toEqual({ mod: 6, proficient: true });
    expect(saves.dexterity).toEqual({ mod: 2, proficient: false });
  });

  it("gives raw ability checks no proficiency", () => {
    expect(checkModifiers(base).abilities).toMatchObject({ strength: 3, charisma: -1 });
  });

  it("applies proficiency and expertise to skills, expertise first", () => {
    const { skills } = checkModifiers(base);
    expect(skills.slice(0, 2)).toEqual([
      { name: "Stealth", ability: "dexterity", mod: 8, proficiency: "expert" },
      { name: "Athletics", ability: "strength", mod: 6, proficiency: "proficient" },
    ]);
    expect(skills.find((s) => s.name === "Perception")?.mod).toBe(1);
    expect(skills).toHaveLength(18);
  });

  it("adds Jack of All Trades to ability checks and unproficient skills, not saves", () => {
    const m = checkModifiers({ ...base, jackOfAllTrades: true });
    expect(m.abilities.intelligence).toBe(1);
    expect(m.skills.find((s) => s.name === "Arcana")?.mod).toBe(1);
    expect(m.skills.find((s) => s.name === "Athletics")?.mod).toBe(6);
    expect(m.saves.dexterity.mod).toBe(2);
  });

  it("takes exhaustion's -2 per level off every d20 test", () => {
    const m = checkModifiers({ ...base, exhaustion: 2 });
    expect(m.abilities.strength).toBe(-1);
    expect(m.saves.strength.mod).toBe(2);
    expect(m.skills.find((s) => s.name === "Stealth")?.mod).toBe(4);
  });
});
