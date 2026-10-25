import type { EncounterParticipant } from "../types/encounter.types";
import type { EncounterEvent } from "./events";

/**
 * The end-of-encounter summary, from the event log and the roll log: the
 * moment the table looks back at the fight before the DM closes it.
 */

export interface Highlights {
  rounds: number;
  biggestHit: { amount: number; target: string } | null;
  damageDealt: number; // to monsters
  damageTaken: number; // by the party
  downed: string[];
  crits: number;
  fumbles: number;
}

interface RollLike {
  diceType?: string;
  result?: number;
}

const num = (v: unknown) => (typeof v === "number" ? v : 0);

/** HP (including temp HP) an event took away, or 0. */
function hpLost(e: EncounterEvent): number {
  const b = e.payload.before ?? {};
  const a = e.payload.after ?? {};
  const before = num(b.hp_current ?? a.hp_current) + num(b.hp_temp ?? a.hp_temp);
  const after = num(a.hp_current ?? b.hp_current) + num(a.hp_temp ?? b.hp_temp);
  return Math.max(0, before - after);
}

export function encounterHighlights(
  events: EncounterEvent[],
  participants: EncounterParticipant[],
  rolls: RollLike[],
  round: number,
): Highlights {
  const h: Highlights = {
    rounds: round,
    biggestHit: null,
    damageDealt: 0,
    damageTaken: 0,
    downed: [],
    crits: 0,
    fumbles: 0,
  };
  tallyDamage(h, events, new Map(participants.map((p) => [p.id, p])));
  tallyRolls(h, rolls);
  return h;
}

function tallyDamage(
  h: Highlights,
  events: EncounterEvent[],
  byId: Map<string, EncounterParticipant>,
) {
  for (const e of events) {
    if (e.kind !== "damage") continue;
    const lost = hpLost(e);
    const target = e.participant_id ? byId.get(e.participant_id) : undefined;
    const name = e.payload.name ?? target?.name ?? "Someone";
    if (target?.is_player) h.damageTaken += lost;
    else h.damageDealt += lost;
    if (lost > (h.biggestHit?.amount ?? 0))
      h.biggestHit = { amount: lost, target: name };
    if (droppedToZero(e) && !h.downed.includes(name)) h.downed.push(name);
  }
}

function droppedToZero(e: EncounterEvent): boolean {
  const after = e.payload.after ?? {};
  return "hp_current" in after && num(after.hp_current) === 0;
}

function tallyRolls(h: Highlights, rolls: RollLike[]) {
  for (const r of rolls) {
    if (!/^1?d20$/.test(r.diceType ?? "")) continue;
    if (r.result === 20) h.crits += 1;
    if (r.result === 1) h.fumbles += 1;
  }
}
