import { Dices } from "lucide-react";
import type { RollEntry } from "../context/DiceContext";
import { describeRoll } from "../lib/logLine";
import type { EncounterParticipant } from "../types/encounter.types";
import { LogEntry } from "./log/LogEntry";

/**
 * The encounter's rolls and announced actions, newest first, each saying who
 * did what to whom. Worked out per viewer: the DM sees modifiers and hit or
 * miss; players see the story of a monster's turn, not its numbers.
 */
export function RollLog({
  entries,
  participants,
  viewerIsDM,
}: {
  entries: RollEntry[];
  /** Named as this viewer sees them. */
  participants: EncounterParticipant[];
  viewerIsDM: boolean;
}) {
  if (entries.length === 0) {
    return (
      <div className="flex h-32 flex-col items-center justify-center gap-2 text-muted-foreground">
        <Dices className="h-8 w-8 opacity-30" />
        <p className="text-xs">No rolls yet</p>
      </div>
    );
  }

  return (
    <ul className="space-y-1" aria-label="Combat log">
      {entries.map((entry) => (
        <LogEntry
          key={entry.id}
          entry={entry}
          line={describeRoll(entry, participants, viewerIsDM)}
          viewerIsDM={viewerIsDM}
        />
      ))}
    </ul>
  );
}
