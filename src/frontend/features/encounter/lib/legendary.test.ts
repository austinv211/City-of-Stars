import { describe, expect, it } from "vitest";
import { lairActionDue, legendaryCost, legendaryCreatures } from "./legendary";
import type { EncounterParticipant } from "../types/encounter.types";

const c = (id: string, order: number, score: number, legendaryMax = 0) =>
  ({
    id,
    initiative_order: order,
    initiative_score: score,
    legendary_actions_max: legendaryMax,
  }) as EncounterParticipant;

describe("legendaryCost", () => {
  it("reads the cost from the name or the description", () => {
    expect(legendaryCost({ name: "Wing Attack (Costs 2 Actions)", desc: "" })).toBe(2);
    expect(
      legendaryCost({ name: "Psychic Drain", desc: "Costs 3 actions. The mind..." }),
    ).toBe(3);
  });

  it("defaults to one", () => {
    expect(legendaryCost({ name: "Tail", desc: "Swipe." })).toBe(1);
  });
});

describe("legendaryCreatures", () => {
  it("keeps only creatures with a budget, in initiative order", () => {
    const list = [c("b", 2, 10, 3), c("x", 1, 15), c("a", 0, 20, 3)];
    expect(legendaryCreatures(list).map((p) => p.id)).toEqual(["a", "b"]);
  });
});

describe("lairActionDue (count 20, losing ties)", () => {
  // Order: fighter 22, dragon 20, rogue 15, goblin 9.
  const order = [
    c("fighter", 0, 22),
    c("dragon", 1, 20),
    c("rogue", 2, 15),
    c("goblin", 3, 9),
  ];

  it("is due as the turn crosses below 20 -- after the tie, not before", () => {
    expect(lairActionDue(order, "dragon", 20)).toBe(false); // tied at 20: dragon first
    expect(lairActionDue(order, "rogue", 20)).toBe(true);
    expect(lairActionDue(order, "goblin", 20)).toBe(false);
  });

  it("opens the round when nobody rolled 20 or more", () => {
    const low = [c("rogue", 0, 15), c("goblin", 1, 9)];
    expect(lairActionDue(low, "rogue", 20)).toBe(true);
    expect(lairActionDue(low, "goblin", 20)).toBe(false);
  });

  it("is never due without a lair, or before the first turn", () => {
    expect(lairActionDue(order, "rogue", null)).toBe(false);
    expect(lairActionDue(order, null, 20)).toBe(false);
  });
});
