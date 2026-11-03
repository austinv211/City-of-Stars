import { describe, expect, it } from "vitest";
import { labelParticipants, withLabels } from "./participantLabels";
import { combatant } from "./participantFixture";

const goblin = (id: string, over = {}) =>
  combatant(id, 1, { name: "Goblin", is_player: false, ...over });

describe("labelParticipants", () => {
  it("letters monsters that share a name, stably by id", () => {
    const labels = labelParticipants([goblin("g2"), goblin("g1"), goblin("g3")], true);
    expect([labels.get("g1"), labels.get("g2"), labels.get("g3")]).toEqual([
      "Goblin A",
      "Goblin B",
      "Goblin C",
    ]);
  });

  it("leaves a lone monster and player characters as they are", () => {
    const labels = labelParticipants(
      [goblin("g1"), combatant("isolde", 2, { name: "Isolde" })],
      false,
    );
    expect(labels.get("g1")).toBe("Goblin");
    expect(labels.get("isolde")).toBe("Isolde");
  });

  it("shows a nickname, with the stat block's name for the DM only", () => {
    const list = [goblin("g1", { nickname: "Grizzle" }), goblin("g2")];
    expect(labelParticipants(list, true).get("g1")).toBe("Grizzle (Goblin)");
    expect(labelParticipants(list, false).get("g1")).toBe("Grizzle");
  });

  it("doesn't letter the one goblin left without a nickname", () => {
    const list = [goblin("g1", { nickname: "Grizzle" }), goblin("g2")];
    expect(labelParticipants(list, false).get("g2")).toBe("Goblin");
  });
});

describe("withLabels", () => {
  it("replaces each name with its label", () => {
    expect(withLabels([goblin("g1"), goblin("g2")], false).map((p) => p.name)).toEqual([
      "Goblin A",
      "Goblin B",
    ]);
  });
});
