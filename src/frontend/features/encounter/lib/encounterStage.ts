import { CONDITION_EFFECTS } from "@/features/characters/data/rules2024";
import type {
  Encounter,
  EncounterEffect,
  EncounterParticipant,
} from "../types/encounter.types";

/**
 * The encounter screen's view-state: what kind of moment this is for the
 * viewer, derived from data that is already loaded.
 *
 * Pure on purpose. Everything downstream -- which stage renders, which
 * controls are live, what the turn bar says -- reads this one object, so the
 * screen's behaviour is decided here, where it can be unit-tested without a
 * DOM or a database, instead of in conditionals scattered through the JSX.
 */

export type StagePhase =
  /** Has a combatant, has not rolled initiative yet. */
  | "rolling-initiative"
  /** At 0 HP: the only thing to do is death saves. Outranks my-turn. */
  | "dying"
  | "my-turn"
  /** Next in the order: time to plan. */
  | "on-deck"
  | "watching"
  /** A player with no combatant of their own. */
  | "spectating"
  | "dm-running";

export interface Slot {
  /** Can be spent right now. */
  available: boolean;
  usedThisTurn: boolean;
  /** The condition preventing use, e.g. "Stunned". */
  blockedBy?: string;
}

export interface Economy {
  action: Slot;
  bonus: Slot;
  reaction: Slot;
}

export interface StageInput {
  isDM: boolean;
  encounter: Pick<Encounter, "current_participant_id" | "round">;
  /** Any order; sorted by initiative here. */
  participants: EncounterParticipant[];
  ownParticipantId: string | null;
  effects: EncounterEffect[];
}

export interface StageState {
  phase: StagePhase;
  round: number;
  active: EncounterParticipant | null;
  /** Whoever acts after `active` (wrapping); the first in order before turn 1. */
  next: EncounterParticipant | null;
  own: EncounterParticipant | null;
  /** The viewer's own action economy; null without a combatant. */
  economy: Economy | null;
  /** Effects on the viewer's combatant. */
  effectsOnMe: EncounterEffect[];
  /** Why parts of the economy are unavailable, for display. */
  blocked: { reason: string; from: string }[];
}

const byInitiative = (a: EncounterParticipant, b: EncounterParticipant) =>
  a.initiative_order - b.initiative_order;

function nextInOrder(
  ordered: EncounterParticipant[],
  activeId: string | null,
): EncounterParticipant | null {
  if (ordered.length === 0) return null;
  const i = ordered.findIndex((p) => p.id === activeId);
  if (i === -1) return ordered[0] ?? null;
  return ordered[(i + 1) % ordered.length] ?? null;
}

/** The first condition that incapacitates, if any. */
function incapacitatedBy(p: EncounterParticipant): string | undefined {
  return [...new Set(p.conditions)].find(
    (c) => c in CONDITION_EFFECTS && CONDITION_EFFECTS[c].incapacitated,
  );
}

function slot(used: boolean, blockedBy: string | undefined): Slot {
  return { available: !used && !blockedBy, usedThisTurn: used, blockedBy };
}

export function deriveEconomy(p: EncounterParticipant): Economy {
  const incap = incapacitatedBy(p);
  return {
    action: slot(p.action_used, incap),
    bonus: slot(p.bonus_used, incap),
    reaction: slot(p.reaction_used, incap),
  };
}

function derivePhase(
  isDM: boolean,
  own: EncounterParticipant | null,
  activeId: string | null,
  next: EncounterParticipant | null,
): StagePhase {
  if (isDM) return "dm-running";
  if (!own) return "spectating";
  if (!own.has_rolled_initiative) return "rolling-initiative";
  if (own.is_player && own.hp_current <= 0) return "dying";
  if (own.id === activeId) return "my-turn";
  if (next?.id === own.id) return "on-deck";
  return "watching";
}

export function deriveStage(input: StageInput): StageState {
  const ordered = [...input.participants].sort(byInitiative);
  const activeId = input.encounter.current_participant_id;
  const active = ordered.find((p) => p.id === activeId) ?? null;
  const next = nextInOrder(ordered, activeId);
  const own = ordered.find((p) => p.id === input.ownParticipantId) ?? null;

  const economy = own ? deriveEconomy(own) : null;
  const incap = own ? incapacitatedBy(own) : undefined;

  return {
    phase: derivePhase(input.isDM, own, activeId, next),
    round: input.encounter.round,
    active,
    next,
    own,
    economy,
    effectsOnMe: own
      ? input.effects.filter((e) => e.target_participant_id === own.id)
      : [],
    blocked: incap
      ? [{ reason: "No action, bonus action or reaction", from: incap }]
      : [],
  };
}
