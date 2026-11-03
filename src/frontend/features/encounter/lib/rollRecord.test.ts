import { describe, expect, it } from "vitest";
import type { Database } from "@/types/database";
import { isDamageRoll, rollFromRow, storedContext } from "./rollRecord";
import { rollPoolWith, totalPool, type DiceSource } from "./poolDice";

type RollRow = Database["public"]["Tables"]["dice_rolls"]["Row"];

const row = (over: Partial<RollRow>): RollRow => ({
  id: "r1",
  campaign_id: "c",
  character_id: null,
  character_name: "Grizzle",
  context: null,
  dice_type: "1d20",
  encounter_id: "e",
  modifier: 4,
  result: 14,
  roll_type: "Scimitar Attack",
  rolled_at: "2026-11-03T00:00:00Z",
  rolled_by_dm: true,
  total: 18,
  user_id: "u",
  ...over,
});

describe("roll records", () => {
  it("survive a reload with their context, advantage and dice", () => {
    const context = storedContext({
      characterName: "Grizzle",
      diceType: "1d20",
      result: 14,
      modifier: 4,
      total: 18,
      rollType: "Scimitar Attack",
      advantage: true,
      discardedRoll: 3,
      rolls: [14],
      context: {
        kind: "attack",
        actorId: "g1",
        targetId: "isolde",
        source: { type: "monster_action", name: "Scimitar" },
      },
    });
    const back = rollFromRow(row({ context }));
    expect(back.context).toEqual({
      kind: "attack",
      actorId: "g1",
      targetId: "isolde",
      source: { type: "monster_action", name: "Scimitar" },
    });
    expect(back.advantage).toBe(true);
    expect(back.discardedRoll).toBe(3);
    expect(back.rolls).toEqual([14]);
  });

  it("bring back announced actions as actions", () => {
    const context = storedContext({
      characterName: "Isolde",
      diceType: "",
      result: 0,
      modifier: 0,
      total: 0,
      rollType: "",
      kind: "action",
      actionText: "Dodge",
      actionCategory: "action",
    });
    const back = rollFromRow(row({ context, roll_type: "Dodge", dice_type: "" }));
    expect(back.kind).toBe("action");
    expect(back.actionText).toBe("Dodge");
  });

  it("read older rows without a context", () => {
    const back = rollFromRow(row({}));
    expect(back.context).toBeUndefined();
    expect(back.total).toBe(18);
  });
});

describe("isDamageRoll", () => {
  it("trusts the context, and falls back to the label for older rolls", () => {
    expect(isDamageRoll({ rollType: "Bite", context: { kind: "damage" } })).toBe(true);
    expect(isDamageRoll({ rollType: "Bite Dmg", context: { kind: "attack" } })).toBe(false);
    expect(isDamageRoll({ rollType: "Bite Dmg" })).toBe(true);
    expect(isDamageRoll({ rollType: "Perception Check" })).toBe(false);
  });
});

describe("rollPoolWith", () => {
  const scripted = (...throws: number[][][]): DiceSource => {
    let i = 0;
    return () => Promise.resolve(throws[i++] ?? []);
  };

  it("totals a pool and reports its d20", () => {
    expect(totalPool([{ sides: 6, count: 2 }, { sides: 20, count: 1 }], [[3, 4], [17]])).toEqual({
      sum: 24,
      d20: 17,
      rolls: [3, 4, 17],
    });
  });

  it("keeps the higher throw with advantage and the lower with disadvantage", async () => {
    const pool = [{ sides: 20, count: 1 }];
    const adv = await rollPoolWith(scripted([[5]], [[15]]), pool, { advantage: true, disadvantage: false });
    expect([adv.sum, adv.discarded, adv.d20]).toEqual([15, 5, 15]);
    const dis = await rollPoolWith(scripted([[5]], [[15]]), pool, { advantage: false, disadvantage: true });
    expect([dis.sum, dis.discarded]).toEqual([5, 15]);
  });
});
