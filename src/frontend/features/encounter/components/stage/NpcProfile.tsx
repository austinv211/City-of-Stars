import { Badge } from "@/core/components/ui/badge";
import type { EncounterParticipant } from "../../types/encounter.types";
import { CombatantBanner } from "../CombatantArt";

/** What a player sees of a monster: its picture and description, no stat block. */
export function NpcProfile({ participant }: { participant: EncounterParticipant }) {
  return (
    <div className="space-y-3">
      <CombatantBanner participant={participant} showHp={false}>
        <Badge variant="secondary" className="text-xs">
          NPC
        </Badge>
      </CombatantBanner>
      {participant.description ? (
        <p className="text-sm leading-relaxed text-muted-foreground">{participant.description}</p>
      ) : (
        <p className="text-xs italic text-muted-foreground">No description available.</p>
      )}
    </div>
  );
}
