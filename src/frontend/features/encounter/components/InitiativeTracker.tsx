import { ParticipantCard } from "./ParticipantCard";
import type { EncounterParticipant } from "../types/encounter.types";
import type { DamageResult } from "../hooks/useEncounterParticipants";

interface Props {
  participants: EncounterParticipant[];
  activeParticipantId: string | null;
  isDM: boolean;
  ownCharacterId: string | null;
  onUpdateConditions: (id: string, conditions: string[]) => void;
  onApplyDamage: (id: string, amount: number, type: string | null, opts?: { crit?: boolean }) => Promise<DamageResult>;
  onHeal: (id: string, amount: number) => void;
  onRollDeathSave: (id: string) => void;
  onSetConcentration: (id: string, spell: string | null) => void;
  onSetCover: (id: string, cover: string) => void;
  onSelect: (id: string) => void;
  selectedId: string | null;
}

export function InitiativeTracker({
  participants,
  activeParticipantId,
  isDM,
  ownCharacterId,
  onUpdateConditions,
  onApplyDamage,
  onHeal,
  onRollDeathSave,
  onSetConcentration,
  onSetCover,
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
            onUpdateConditions={(conds) => onUpdateConditions(p.id, conds)}
            onApplyDamage={(amount, type, opts) => onApplyDamage(p.id, amount, type, opts)}
            onHeal={(amount) => onHeal(p.id, amount)}
            onRollDeathSave={() => onRollDeathSave(p.id)}
            onSetConcentration={(spell) => onSetConcentration(p.id, spell)}
            onSetCover={(cover) => onSetCover(p.id, cover)}
            onClick={() => onSelect(p.id)}
            selected={p.id === selectedId}
          />
        );
      })}
    </div>
  );
}
