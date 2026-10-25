import { coverAcBonus } from "@/features/characters/data/rules2024";
import type { EncounterParticipant } from "../types/encounter.types";

/**
 * Attack resolution against a selected target -- the plumbing that turns
 * "roll, read the number, find the target's AC, decide" into one glance.
 * No new game rules: AC and cover come from rules2024.
 */

export type AttackVerdict = "crit" | "hit" | "miss" | "fumble";

/** What the viewer is allowed to know about their target. */
export interface TargetInfo {
  participant: EncounterParticipant;
  /** AC including cover; null when hidden from this viewer. */
  ac: number | null;
  /** Total cover: cannot be targeted directly at all. */
  totalCover: boolean;
}

/**
 * Players do not see monster AC (or HP) anywhere else in the app, so they do
 * not see it here either -- and a HIT/MISS verdict against a hidden AC would
 * leak it just as surely. Same rule as the initiative tracker's `showAC`.
 */
export function canSeeAc(viewerIsDM: boolean, target: EncounterParticipant): boolean {
  return viewerIsDM || target.is_player;
}

export function targetInfo(
  viewerIsDM: boolean,
  target: EncounterParticipant,
): TargetInfo {
  return {
    participant: target,
    ac: canSeeAc(viewerIsDM, target) ? target.ac + coverAcBonus(target.cover) : null,
    totalCover: target.cover === "total",
  };
}

/**
 * Judge a d20 attack. The natural roll is recovered as total - modifier,
 * which holds with advantage/disadvantage too (the modifier is added once, to
 * the kept die). A natural 20 always hits and crits; a natural 1 always
 * misses (2024 PHB, "Rolling 1 or 20").
 */
export function judgeAttack(
  total: number,
  modifier: number,
  ac: number,
): AttackVerdict {
  const natural = total - modifier;
  if (natural >= 20) return "crit";
  if (natural <= 1) return "fumble";
  return total >= ac ? "hit" : "miss";
}
