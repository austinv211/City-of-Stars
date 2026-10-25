import { describe, expect, it } from "vitest";
import { encounterHighlights } from "./highlights";
import type { EncounterEvent } from "./events";
import type { EncounterParticipant } from "../types/encounter.types";

const people = [
  { id: "lyra", name: "Lyra", is_player: true },
  { id: "gob", name: "Goblin", is_player: false },
] as EncounterParticipant[];

let id = 0;
const dmg = (
  participant: string,
  before: Record<string, number>,
  after: Record<string, number>,
): EncounterEvent => ({
  id: ++id,
  encounter_id: "e",
  actor_id: null,
  round: 1,
  kind: "damage",
  participant_id: participant,
  payload: { before, after },
  created_at: "",
});

describe("encounterHighlights", () => {
  const events = [
    dmg("gob", { hp_current: 7 }, { hp_current: 2 }),
    dmg("lyra", { hp_current: 30, hp_temp: 5 }, { hp_current: 22, hp_temp: 0 }),
    dmg("gob", { hp_current: 2 }, { hp_current: 0 }),
    { ...dmg("gob", {}, {}), kind: "heal" as const },
  ];
  const rolls = [
    { diceType: "d20", result: 20 },
    { diceType: "1d20", result: 1 },
    { diceType: "1d20", result: 20 },
    { diceType: "2d6", result: 12 },
  ];
  const h = encounterHighlights(events, people, rolls, 4);

  it("splits damage between monsters and the party, temp HP included", () => {
    expect(h.damageDealt).toBe(7);
    expect(h.damageTaken).toBe(13);
  });

  it("finds the biggest single hit", () => {
    expect(h.biggestHit).toEqual({ amount: 13, target: "Lyra" });
  });

  it("lists who dropped, once each", () => {
    expect(h.downed).toEqual(["Goblin"]);
  });

  it("counts natural 20s and 1s on d20s only", () => {
    expect(h.crits).toBe(2);
    expect(h.fumbles).toBe(1);
  });

  it("carries the round count", () => {
    expect(h.rounds).toBe(4);
  });
});
