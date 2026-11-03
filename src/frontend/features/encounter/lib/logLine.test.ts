import { describe, expect, it } from "vitest";
import type { RollEntry } from "../context/DiceContext";
import { describeRoll } from "./logLine";
import { combatant } from "./participantFixture";

const grizzle = combatant("g1", 1, { name: "Grizzle", is_player: false, ac: 15 });
const isolde = combatant("isolde", 2, { name: "Isolde", ac: 16 });
const people = [grizzle, isolde];

const entry = (over: Partial<RollEntry>): RollEntry => ({
  id: "r",
  ts: 0,
  encounterId: "e",
  characterName: "Grizzle",
  rolledByDm: true,
  diceType: "1d20",
  result: 14,
  modifier: 4,
  total: 18,
  rollType: "Scimitar Attack",
  ...over,
});

const goblinAttack = entry({
  context: {
    kind: "attack",
    actorId: "g1",
    targetId: "isolde",
    source: { type: "monster_action", name: "Scimitar" },
  },
});

describe("describeRoll", () => {
  it("says who attacked whom, with what, and the DM's verdict", () => {
    const line = describeRoll(goblinAttack, people, true);
    expect(line).toMatchObject({
      actor: "Grizzle",
      target: "Isolde",
      title: "Scimitar",
      kind: "Attack",
      total: 18,
      breakdown: "1d20 (14+4)",
      verdict: { verdict: "hit", ac: 16 },
    });
  });

  it("shows players the same line without the monster's numbers or a verdict", () => {
    const line = describeRoll(goblinAttack, people, false);
    expect(line).toMatchObject({ actor: "Grizzle", target: "Isolde", title: "Scimitar", total: 18 });
    expect(line.breakdown).toBeNull();
    expect(line.verdict).toBeNull();
  });

  it("shows players the full breakdown of a player's roll", () => {
    const line = describeRoll(
      entry({
        characterName: "Isolde",
        rolledByDm: false,
        context: { kind: "attack", actorId: "isolde", targetId: "g1", source: { type: "weapon", name: "Longsword" } },
      }),
      people,
      false,
    );
    expect(line.breakdown).toBe("1d20 (14+4)");
    // A player never sees a monster's AC, so no verdict either.
    expect(line.verdict).toBeNull();
  });

  it("names the actor by the viewer's label, falling back to the stored name", () => {
    const relabelled = [{ ...grizzle, name: "Grizzle (Goblin)" }, isolde];
    expect(describeRoll(goblinAttack, relabelled, true).actor).toBe("Grizzle (Goblin)");
    expect(describeRoll(entry({ context: undefined }), [], false).actor).toBe("DM — Grizzle");
  });

  it("flags a natural 20 and advantage", () => {
    const line = describeRoll(entry({ result: 20, total: 24, advantage: true }), people, true);
    expect(line.badges).toEqual(["crit", "adv"]);
  });

  it("describes an announced action", () => {
    const line = describeRoll(
      entry({
        kind: "action",
        actionText: "Dodge",
        actionCategory: "action",
        characterName: "Isolde",
        rolledByDm: false,
        context: { kind: "action", actorId: "isolde" },
      }),
      people,
      true,
    );
    expect(line).toMatchObject({ actor: "Isolde", title: "Dodge", total: null, category: "action" });
  });
});
