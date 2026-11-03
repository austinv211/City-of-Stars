import { ChevronLeft, Eye } from "lucide-react";
import { Button } from "@/core/components/ui/button";
import type { EncounterScreen } from "../../hooks/useEncounterScreen";

/**
 * Shown while the viewer is looking at someone other than their default --
 * the acting combatant for the DM, their own for a player -- with the way back.
 */
export function ViewingChip({ screen }: { screen: EncounterScreen }) {
  const { peekId, panelParticipant, isDM, isSpectator } = screen;
  if (!peekId || !panelParticipant) return null;

  let back = "Back to me";
  if (isDM) back = "Back to turn";
  else if (isSpectator) back = "Back to my rolls";

  return (
    <div
      role="status"
      aria-label={`Viewing ${panelParticipant.name}`}
      className="mb-3 flex items-center gap-2 border border-primary/40 bg-primary/5 px-2.5 py-1 text-xs"
    >
      <Eye className="h-3.5 w-3.5 shrink-0 text-primary" />
      <span className="min-w-0 truncate">
        Viewing <span className="font-semibold">{panelParticipant.name}</span>
      </span>
      <Button
        variant="ghost"
        size="sm"
        className="ml-auto h-7 shrink-0 gap-1 px-2 text-xs"
        onClick={screen.backToDefault}
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        {back}
      </Button>
    </div>
  );
}
