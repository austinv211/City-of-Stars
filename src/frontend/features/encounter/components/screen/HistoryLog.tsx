import { History, Undo2 } from "lucide-react";
import { Button } from "@/core/components/ui/button";
import { cn } from "@/lib/utils";
import type { EncounterParticipant } from "../../types/encounter.types";
import { describeEvent, undoState, type EncounterEvent } from "../../lib/events";

/**
 * The DM's view of the event log: what happened, newest first, with Undo on
 * each change that can still be cleanly reverted.
 */
export function HistoryLog({
  events,
  participants,
  onUndo,
}: {
  events: EncounterEvent[];
  participants: EncounterParticipant[];
  onUndo: (patch: Record<string, unknown>, participant: EncounterParticipant) => void;
}) {
  const byId = new Map(participants.map((p) => [p.id, p]));
  const nameOf = (id: string | null) => (id ? (byId.get(id)?.name ?? "Someone") : "—");

  if (events.length === 0) {
    return (
      <div className="flex h-32 flex-col items-center justify-center gap-2 text-muted-foreground">
        <History className="h-8 w-8 opacity-30" />
        <p className="text-xs">Nothing has happened yet</p>
      </div>
    );
  }

  return (
    <ol className="space-y-1" aria-label="Encounter history">
      {events.map((e) => {
        const participant = e.participant_id ? byId.get(e.participant_id) : undefined;
        const state = undoState(e, participant);
        const isTurn = e.kind === "turn";
        return (
          <li
            key={e.id}
            className={cn(
              "flex items-center gap-2 px-2 py-1.5 text-xs",
              isTurn ? "text-muted-foreground" : "bg-muted/30",
            )}
          >
            {e.round !== null && (
              <span className="w-6 shrink-0 font-mono text-[10px] text-muted-foreground">
                R{e.round}
              </span>
            )}
            <span className="min-w-0 flex-1">{describeEvent(e, nameOf)}</span>
            {state.ok && participant ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 shrink-0 gap-1 px-2 text-xs"
                onClick={() => {
                  onUndo(state.patch, participant);
                }}
              >
                <Undo2 className="h-3 w-3" /> Undo
              </Button>
            ) : (
              !state.ok &&
              state.reason === "Changed since" && (
                <span className="shrink-0 text-[10px] text-muted-foreground">
                  changed since
                </span>
              )
            )}
          </li>
        );
      })}
    </ol>
  );
}
