import type {
  EncounterParticipant,
  MonsterSpecialAbility,
} from "../types/encounter.types";

/**
 * Legendary and lair action rules, pure.
 *
 * Legendary actions are spent between other creatures' turns from a per-round
 * budget (advance_encounter_turn refills it at the start of the creature's
 * own turn). Lair actions happen on initiative count 20, losing ties.
 */

/** A legendary action's cost: "Wing Attack (Costs 2 Actions)" -> 2, else 1. */
export function legendaryCost(action: MonsterSpecialAbility): number {
  const m = /costs?\s+(\d+)\s+actions?/i.exec(`${action.name} ${action.desc}`);
  const n = m ? Number(m[1]) : 1;
  return n >= 1 ? n : 1;
}

/** The legendary creatures in an encounter, in initiative order. */
export function legendaryCreatures(
  participants: EncounterParticipant[],
): EncounterParticipant[] {
  return participants
    .filter((p) => p.legendary_actions_max > 0)
    .sort((a, b) => a.initiative_order - b.initiative_order);
}

/**
 * Is the lair's turn right before the active combatant's?
 *
 * The lair acts on count `lairInit`, after every creature with that score or
 * higher ("losing ties") and before the rest. So it is due when the turn has
 * just crossed that count: the active creature is below it and the one before
 * it was at or above it. When nobody rolled that high the lair opens the
 * round, before the first creature.
 */
export function lairActionDue(
  participants: EncounterParticipant[],
  activeId: string | null,
  lairInit: number | null,
): boolean {
  if (lairInit === null || !activeId) return false;
  const ordered = [...participants].sort(
    (a, b) => a.initiative_order - b.initiative_order,
  );
  const i = ordered.findIndex((p) => p.id === activeId);
  if (i < 0 || ordered[i].initiative_score >= lairInit) return false;
  if (i === 0) return true; // nobody at or above the lair: it opens the round
  return ordered[i - 1].initiative_score >= lairInit;
}
