import { InitiativeTracker } from "../InitiativeTracker";
import type { EncounterScreen } from "../../hooks/useEncounterScreen";

/** The full initiative order, with the DM's per-combatant controls. */
export function TrackerRegion({
  screen,
  onSelect,
}: {
  screen: EncounterScreen;
  /** Defaults to selecting the combatant's panel. */
  onSelect?: (id: string) => void;
}) {
  const { combat } = screen;
  return (
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
      onSelect={onSelect ?? screen.setSelectedId}
      selectedId={screen.selectedId}
      targetId={screen.targetId}
      onTarget={screen.canTarget ? screen.toggleTarget : undefined}
    />
  );
}
