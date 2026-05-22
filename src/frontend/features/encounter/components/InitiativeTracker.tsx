import { ParticipantCard } from "./ParticipantCard";
import type { EncounterParticipant } from "../types/encounter.types";

interface Props {
  participants: EncounterParticipant[];
  activeParticipantId: string | null;
  isDM: boolean;
  ownCharacterId: string | null;
  onAdjustHP: (id: string, delta: number) => void;
  onUpdateConditions: (id: string, conditions: string[]) => void;
  onSelect: (id: string) => void;
  selectedId: string | null;
}

export function InitiativeTracker({
  participants,
  activeParticipantId,
  isDM,
  ownCharacterId,
  onAdjustHP,
  onUpdateConditions,
  onSelect,
  selectedId,
}: Props) {
  if (participants.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        No participants yet
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {participants.map((p) => {
        // DMs see everything; players see HP+AC only for other player characters, not NPCs
        const canEdit = isDM || p.character_id === ownCharacterId;
        const showHP = isDM || p.is_player;
        const showAC = isDM || p.is_player;

        return (
          <ParticipantCard
            key={p.id}
            participant={p}
            isActive={p.id === activeParticipantId}
            canEditHP={canEdit}
            showHP={showHP}
            showAC={showAC}
            onAdjustHP={(delta) => onAdjustHP(p.id, delta)}
            onUpdateConditions={(conds) => onUpdateConditions(p.id, conds)}
            onClick={() => onSelect(p.id)}
            selected={p.id === selectedId}
          />
        );
      })}
    </div>
  );
}
