import type { CharacterWithScores } from "@/features/characters/types/character.types";
import type { EncounterParticipant } from "../../types/encounter.types";
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
}
