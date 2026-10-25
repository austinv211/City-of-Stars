import { describe, expect, it } from "vitest";
import { canSeeAc, judgeAttack, targetInfo } from "./attack";
import type { EncounterParticipant } from "../types/encounter.types";

const goblin = { ac: 15, cover: "none", is_player: false } as EncounterParticipant;
const ally = { ac: 16, cover: "none", is_player: true } as EncounterParticipant;

describe("judgeAttack", () => {
  it("hits when the total meets the AC -- meets, not beats", () => {
    expect(judgeAttack(15, 4, 15)).toBe("hit");
    expect(judgeAttack(14, 4, 15)).toBe("miss");
  });

  it("a natural 20 crits even when the total misses", () => {
    expect(judgeAttack(18, -2, 25)).toBe("crit");
  });

  it("a natural 1 misses even when the total would hit", () => {
    expect(judgeAttack(11, 10, 5)).toBe("fumble");
  });
});

describe("targetInfo", () => {
  it("adds cover to the AC the DM sees", () => {
    expect(targetInfo(true, { ...goblin, cover: "half" }).ac).toBe(17);
    expect(targetInfo(true, { ...goblin, cover: "three_quarters" }).ac).toBe(20);
  });

  it("hides a monster's AC from a player, as the tracker already does", () => {
    expect(canSeeAc(false, goblin)).toBe(false);
    expect(targetInfo(false, goblin).ac).toBeNull();
  });

  it("shows a fellow player's AC to a player", () => {
    expect(targetInfo(false, ally).ac).toBe(16);
  });

  it("flags total cover: no AC bonus, simply not targetable", () => {
    const t = targetInfo(true, { ...goblin, cover: "total" });
    expect(t.totalCover).toBe(true);
    expect(t.ac).toBe(15);
  });
});
