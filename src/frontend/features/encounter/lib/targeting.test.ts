import { describe, expect, it } from "vitest";
import { setTarget, targetOf, toggleTarget } from "./targeting";

describe("targeting", () => {
  const live = new Set(["goblinA", "goblinB", "isolde", "corin"]);

  it("keeps a separate target per combatant", () => {
    let map = setTarget({}, "goblinA", "isolde");
    map = setTarget(map, "goblinB", "corin");
    expect(targetOf(map, "goblinA", live)).toBe("isolde");
    expect(targetOf(map, "goblinB", live)).toBe("corin");
  });

  it("clears with null and when toggled on the same target", () => {
    const map = setTarget({}, "goblinA", "isolde");
    expect(targetOf(setTarget(map, "goblinA", null), "goblinA", live)).toBeNull();
    expect(targetOf(toggleTarget(map, "goblinA", "isolde"), "goblinA", live)).toBeNull();
    expect(targetOf(toggleTarget(map, "goblinA", "corin"), "goblinA", live)).toBe("corin");
  });

  it("never targets itself", () => {
    expect(setTarget({}, "goblinA", "goblinA")).toEqual({});
  });

  it("ignores a target that left the encounter", () => {
    const map = setTarget({}, "goblinA", "isolde");
    expect(targetOf(map, "goblinA", new Set(["goblinA"]))).toBeNull();
  });

  it("has no target without an actor", () => {
    expect(targetOf({ goblinA: "isolde" }, null, live)).toBeNull();
  });
});
