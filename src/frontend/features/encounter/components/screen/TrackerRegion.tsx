import { useState } from "react";
import { InitiativeTracker } from "../InitiativeTracker";
import { EditAppearanceDialog } from "../stage/EditAppearanceDialog";
import type { EncounterScreen } from "../../hooks/useEncounterScreen";

/** The full initiative order, with the DM's per-combatant controls. */
export function TrackerRegion({
  screen,
  onSelect,
}: {
  screen: EncounterScreen;
  /** Defaults to showing the combatant's panel. */
  onSelect?: (id: string) => void;
}) {
  const { combat } = screen;
  const [appearanceId, setAppearanceId] = useState<string | null>(null);
  // The raw row, so the dialog edits the real nickname, not the label.
  const editing = combat.participants.find((p) => p.id === appearanceId) ?? null;
  return (
    <>
      <InitiativeTracker
        participants={screen.participants}
        activeParticipantId={screen.encounter?.current_participant_id ?? null}
        isDM={screen.isDM}
        ownCharacterId={screen.ownCharacter?.id ?? null}
        onUpdateConditions={combat.updateConditions}
        onApplyDamage={combat.applyDamage}
        onHeal={combat.applyHealing}
        onRollDeathSave={screen.rollDeathSave}
        onSetConcentration={combat.setConcentration}
        onSetCover={combat.setCover}
        onSelect={onSelect ?? screen.selectParticipant}
        selectedId={screen.panelParticipant?.id ?? null}
        targetId={screen.targetId}
        onTarget={screen.canTarget ? screen.toggleTarget : undefined}
        onEditAppearance={screen.isDM ? setAppearanceId : undefined}
      />
      <EditAppearanceDialog
        key={appearanceId ?? "closed"}
        participant={editing}
        onClose={() => {
          setAppearanceId(null);
        }}
        onSave={combat.setAppearance}
      />
    </>
  );
}
