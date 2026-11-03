import { Droplets } from "lucide-react";
import { woundState } from "../../lib/attack";
import type { EncounterParticipant } from "../../types/encounter.types";

/** "Bloodied" or "Down" for a combatant whose HP the viewer can't see. */
export function WoundBadge({ participant }: { participant: EncounterParticipant }) {
  const state = woundState(participant);
  if (!state) return null;
  return (
    <span className="flex shrink-0 items-center gap-1 text-destructive">
      <Droplets className="h-3 w-3" /> {state === "down" ? "Down" : "Bloodied"}
    </span>
  );
}
