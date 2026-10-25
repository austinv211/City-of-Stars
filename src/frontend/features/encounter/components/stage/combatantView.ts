import type { CharacterWithScores } from "@/features/characters/types/character.types";
import type { EncounterParticipant } from "../../types/encounter.types";
import type { DamageResult } from "../../hooks/useEncounterParticipants";
import type { TargetInfo } from "../../lib/attack";
import type { CombatantStats } from "./combatantStats";
import type { CombatRolls } from "./useCombatRolls";

/** Everything a stage section needs to render and act for one combatant. */
export interface CombatantView {
  participant: EncounterParticipant;
  character: CharacterWithScores | null;
  stats: CombatantStats;
  rolls: CombatRolls;
  /** The viewer cannot act for this combatant (another player's, as a player). */
  locked: boolean;
  /** Who this combatant's attacks are aimed at, as far as the viewer may know. */
  target: TargetInfo | null;
  /**
   * Apply rolled damage to the target. DM only: a player cannot write to a
   * monster's row, so for them attack cards report and the DM applies.
   */
  onApplyDamage?: (
    amount: number,
    type: string | null,
    crit: boolean,
  ) => Promise<DamageResult>;
}
