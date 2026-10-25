import { describe, expect, it } from "vitest";
import { describeEvent, undoState, type EncounterEvent } from "./events";
import type { EncounterParticipant } from "../types/encounter.types";

const ev = (over: Partial<EncounterEvent>): EncounterEvent => ({
  id: 1,
  encounter_id: "enc",
  actor_id: null,
  round: 2,
  kind: "damage",
  participant_id: "gob",
  payload: { name: "Goblin", before: { hp_current: 7 }, after: { hp_current: 2 } },
  created_at: "",
  ...over,
});
const nameOf = (id: string | null) => (id === "gob" ? "Goblin" : "Lyra");

describe("describeEvent", () => {
  it("reads damage and healing, counting temp HP", () => {
    expect(describeEvent(ev({}), nameOf)).toBe("Goblin took 5");
    expect(
      describeEvent(
        ev({
          payload: {
            name: "Lyra",
            before: { hp_current: 20, hp_temp: 5 },
            after: { hp_current: 18, hp_temp: 0 },
          },
        }),
        nameOf,
      ),
    ).toBe("Lyra took 7");
    expect(
      describeEvent(
        ev({
          kind: "heal",
          payload: {
            name: "Lyra",
            before: { hp_current: 3 },
            after: { hp_current: 10 },
          },
        }),
        nameOf,
      ),
    ).toBe("Lyra regained 7");
  });

  it("names conditions added and removed", () => {
    const e = ev({
      kind: "condition",
      payload: {
        name: "Lyra",
        before: { conditions: ["Prone"] },
        after: { conditions: ["Grappled"] },
      },
    });
    expect(describeEvent(e, nameOf)).toBe("Lyra: Grappled added, Prone removed");
  });

  it("marks a new round", () => {
    expect(
      describeEvent(ev({ kind: "turn", round: 3, payload: { wrapped: true } }), nameOf),
    ).toBe("Round 3 begins");
  });
});

describe("undoState", () => {
  const goblin = (hp: number) =>
    ({ id: "gob", hp_current: hp }) as EncounterParticipant;

  it("restores `before` while the combatant is as the event left it", () => {
    expect(undoState(ev({}), goblin(2))).toEqual({
      ok: true,
      patch: { hp_current: 7 },
    });
  });

  it("refuses once something has changed since -- it would clobber that too", () => {
    expect(undoState(ev({}), goblin(0))).toEqual({
      ok: false,
      reason: "Changed since",
    });
  });

  it("refuses turns and effects, and combatants that have left", () => {
    expect(undoState(ev({ kind: "turn" }), goblin(2)).ok).toBe(false);
    expect(undoState(ev({ kind: "effect_added" }), goblin(2)).ok).toBe(false);
    expect(undoState(ev({}), undefined)).toEqual({
      ok: false,
      reason: "No longer in the encounter",
    });
  });

  it("compares arrays by value", () => {
    const e = ev({
      kind: "condition",
      payload: { before: { conditions: [] }, after: { conditions: ["Prone"] } },
    });
    const lyra = {
      id: "gob",
      conditions: ["Prone"],
    } as unknown as EncounterParticipant;
    expect(undoState(e, lyra)).toEqual({ ok: true, patch: { conditions: [] } });
  });
});
