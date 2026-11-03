import { useQuickView } from "../../context/QuickViewContext";
import type { EncounterParticipant } from "../../types/encounter.types";
import { CombatantThumb } from "../CombatantArt";

/** The picture; on the encounter screen it opens this combatant's quick view. */
export function QuickThumb({ participant: p }: { participant: EncounterParticipant }) {
  const quickView = useQuickView();
  const thumb = <CombatantThumb participant={p} className="h-10 w-10 rounded-full text-xs" />;
  if (!quickView) return thumb;
  return (
    <button
      type="button"
      className="rounded-full focus-visible:ring-2 focus-visible:ring-primary"
      aria-label={`About ${p.name}`}
      onClick={(e) => {
        // Looking someone up is not selecting their panel.
        e.stopPropagation();
        quickView.open({ kind: "combatant", id: p.id });
      }}
    >
      {thumb}
    </button>
  );
}
