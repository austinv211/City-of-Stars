import { describe, expect, it } from "vitest";
import { publicActionText } from "./publicText";

describe("publicActionText", () => {
  it("removes the to-hit bonus and damage numbers from 2014 SRD text", () => {
    expect(
      publicActionText(
        "Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 5 (1d6 + 2) slashing damage.",
      ),
    ).toBe("Melee Weapon Attack: reach 5 ft., one target. Hit: slashing damage.");
  });

  it("removes them from 2024 text too", () => {
    expect(
      publicActionText("Melee Attack Roll: +4, reach 5 ft. Hit: 5 (1d6 + 2) Slashing damage."),
    ).toBe("Melee Attack Roll: reach 5 ft. Hit: Slashing damage.");
  });

  it("keeps flavour and save DCs", () => {
    const text =
      "The dragon exhales fire in a 15-foot cone. Each creature in that area must make a DC 13 Dexterity saving throw.";
    expect(publicActionText(text)).toBe(text);
  });
});
