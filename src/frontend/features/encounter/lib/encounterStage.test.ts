import { describe, expect, it } from "vitest";
import { deriveStage, type StageInput } from "./encounterStage";
import type { EncounterEffect, EncounterParticipant } from "../types/encounter.types";

function combatant(
  id: string,
  order: number,
  over: Partial<EncounterParticipant> = {},
) {
  return {
    id,
    encounter_id: "enc",
    character_id: null,
    name: id,
    portrait_url: null,
    initiative_order: order,
    initiative_score: 10,
    hp_current: 10,
    hp_max: 10,
    hp_temp: 0,
    ac: 12,
    conditions: [],
    is_player: true,
    owner_id: null,
    str_score: null,
    dex_score: null,
    con_score: null,
    int_score: null,
    wis_score: null,
    cha_score: null,
    actions: null,
    special_abilities: null,
    has_rolled_initiative: true,
    description: null,
    damage_resistances: [],
    damage_immunities: [],
    damage_vulnerabilities: [],
    concentrating_on: null,
    death_save_successes: 0,
    death_save_failures: 0,
    exhaustion: 0,
    heroic_inspiration: false,
    cover: "none",
    action_used: false,
    bonus_used: false,
    reaction_used: false,
    dodging: false,
    legendary_actions: null,
    legendary_actions_max: 0,
    legendary_actions_remaining: 0,
    ...over,
  } satisfies EncounterParticipant;
}

// Order: fighter(1), goblin(2), me(3).
const fighter = combatant("fighter", 1);
const goblin = combatant("goblin", 2, { is_player: false });
const me = combatant("me", 3);

function stage(over: Partial<StageInput> & { activeId?: string | null } = {}) {
  const { activeId = "fighter", ...rest } = over;
  return deriveStage({
    isDM: false,
    encounter: { current_participant_id: activeId, round: 2 },
    // Deliberately out of order: the derivation must sort by initiative.
    participants: [me, goblin, fighter],
    ownParticipantId: "me",
    effects: [],
    ...rest,
  });
}

describe("deriveStage: phase", () => {
  it("is my-turn when I hold the turn", () => {
    expect(stage({ activeId: "me" }).phase).toBe("my-turn");
  });

  it("is on-deck when I act next", () => {
    expect(stage({ activeId: "goblin" }).phase).toBe("on-deck");
  });

  it("is watching otherwise", () => {
    expect(stage({ activeId: "fighter" }).phase).toBe("watching");
  });

  it("wraps: the first in order is on deck while the last acts", () => {
    const s = stage({ activeId: "me", ownParticipantId: "fighter" });
    expect(s.next?.id).toBe("fighter");
    expect(s.phase).toBe("on-deck");
  });

  it("before the first turn, the first in order is on deck", () => {
    const s = stage({ activeId: null, ownParticipantId: "fighter" });
    expect(s.active).toBeNull();
    expect(s.phase).toBe("on-deck");
  });

  it("is dying at 0 HP, even on my own turn", () => {
    const s = stage({
      activeId: "me",
      participants: [combatant("me", 3, { hp_current: 0 }), goblin, fighter],
    });
    expect(s.phase).toBe("dying");
  });

  it("an NPC at 0 HP is not 'dying' -- monsters just drop", () => {
    const s = stage({
      ownParticipantId: "goblin",
      activeId: "goblin",
      participants: [
        me,
        combatant("goblin", 2, { is_player: false, hp_current: 0 }),
        fighter,
      ],
    });
    expect(s.phase).toBe("my-turn");
  });

  it("is rolling-initiative until I have rolled, ahead of everything else", () => {
    const s = stage({
      activeId: "me",
      participants: [
        combatant("me", 3, { has_rolled_initiative: false, hp_current: 0 }),
        goblin,
      ],
    });
    expect(s.phase).toBe("rolling-initiative");
  });

  it("is spectating with no combatant of my own", () => {
    expect(stage({ ownParticipantId: null }).phase).toBe("spectating");
  });

  it("is dm-running for the DM, whatever else is true", () => {
    expect(stage({ isDM: true, activeId: "me" }).phase).toBe("dm-running");
  });
});

describe("deriveStage: economy", () => {
  it("marks spent slots as used and unavailable", () => {
    const s = stage({
      participants: [combatant("me", 3, { action_used: true }), goblin, fighter],
    });
    expect(s.economy?.action).toEqual({
      available: false,
      usedThisTurn: true,
      blockedBy: undefined,
    });
    expect(s.economy?.bonus.available).toBe(true);
  });

  it("blocks every slot while incapacitated, naming the condition", () => {
    const s = stage({
      participants: [combatant("me", 3, { conditions: ["Stunned"] }), goblin, fighter],
    });
    expect(s.economy?.reaction).toEqual({
      available: false,
      usedThisTurn: false,
      blockedBy: "Stunned",
    });
    expect(s.blocked).toEqual([
      { reason: "No action, bonus action or reaction", from: "Stunned" },
    ]);
  });

  it("does not block for a condition that only imposes disadvantage", () => {
    const s = stage({
      participants: [combatant("me", 3, { conditions: ["Poisoned"] }), goblin, fighter],
    });
    expect(s.economy?.action.available).toBe(true);
    expect(s.blocked).toEqual([]);
  });

  it("is null without a combatant", () => {
    expect(stage({ ownParticipantId: null }).economy).toBeNull();
  });
});

describe("deriveStage: effects and round", () => {
  it("collects only the effects on my combatant", () => {
    const fx = (id: string, target: string) =>
      ({ id, target_participant_id: target }) as EncounterEffect;
    const s = stage({ effects: [fx("bless", "me"), fx("mark", "goblin")] });
    expect(s.effectsOnMe.map((e) => e.id)).toEqual(["bless"]);
  });

  it("passes the round through", () => {
    expect(stage().round).toBe(2);
  });
});
