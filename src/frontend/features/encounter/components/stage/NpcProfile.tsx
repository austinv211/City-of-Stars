import { Badge } from "@/core/components/ui/badge";
import type { EncounterParticipant } from "../../types/encounter.types";

/** What a player sees of a monster: portrait and description, no stat block. */
export function NpcProfile({ participant }: { participant: EncounterParticipant }) {
  return (
    <div className="flex flex-col gap-4">
      {participant.portrait_url ? (
        <img
          src={participant.portrait_url}
          alt={participant.name}
          className="max-h-72 w-full rounded-md object-cover"
        />
      ) : null}
      <div>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="text-base font-bold">{participant.name}</span>
          <Badge variant="secondary" className="text-xs">
            NPC
          </Badge>
        </div>
        {participant.description ? (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {participant.description}
          </p>
        ) : (
          <p className="text-xs italic text-muted-foreground">
            No description available.
          </p>
        )}
      </div>
    </div>
  );
}
