import { useState } from "react";
import { Button } from "@/core/components/ui/button";
import { Badge } from "@/core/components/ui/badge";
import { Separator } from "@/core/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/core/components/ui/dialog";
import { InitiativeTracker } from "../components/InitiativeTracker";
import { ActionPanel } from "../components/ActionPanel";
import { useActiveEncounter } from "../hooks/useActiveEncounter";
import { useEncounterParticipants } from "../hooks/useEncounterParticipants";
import { useCampaign } from "@/core/context/CampaignContext";
import { useCharacter } from "@/features/characters/hooks/useCharacter";
import { useCharacters } from "@/features/characters/hooks/useCharacters";
import { useAuth } from "@/core/context/AuthContext";
import { Swords } from "lucide-react";

export default function EncounterPage() {
  const { user } = useAuth();
  const { campaign, isDM, activeEncounterId } = useCampaign();
  const { encounter, endEncounter } = useActiveEncounter();
  const { participants, updateHP, updateConditions } = useEncounterParticipants(
    activeEncounterId
  );
  const { characters } = useCharacters();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmEnd, setConfirmEnd] = useState(false);

  // Find current user's active character
  const ownCharacter = characters.find(
    (c) => c.owner_id === user?.id && c.status === "active"
  );
  const ownParticipant = participants.find(
    (p) => p.character_id === ownCharacter?.id
  );

  // For the action panel, use first selected or own participant
  const panelParticipantId = selectedId ?? ownParticipant?.id ?? null;
  const panelParticipant = participants.find((p) => p.id === panelParticipantId);

  const { character: panelCharacter } = useCharacter(
    panelParticipant?.character_id ?? undefined
  );

  // Determine whose turn it is (first in list = active)
  const activeParticipantId = participants[0]?.id ?? null;

  if (!encounter || !activeEncounterId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Swords className="h-16 w-16 text-muted-foreground opacity-40" />
        <p className="text-muted-foreground">No active encounter</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Swords className="h-5 w-5 text-primary" />
          <h1 className="font-bold text-lg">{encounter.name ?? "Encounter"}</h1>
          <Badge variant="default">Active</Badge>
        </div>
        {isDM && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setConfirmEnd(true)}
          >
            End Encounter
          </Button>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-hidden flex">
        {/* Initiative tracker */}
        <div className="w-80 shrink-0 border-r overflow-y-auto p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            Initiative Order
          </p>
          <InitiativeTracker
            participants={participants}
            activeParticipantId={activeParticipantId}
            isDM={isDM}
            ownCharacterId={ownCharacter?.id ?? null}
            onAdjustHP={updateHP}
            onUpdateConditions={updateConditions}
            onSelect={setSelectedId}
            selectedId={selectedId}
          />
        </div>

        <Separator orientation="vertical" />

        {/* Action panel */}
        <div className="flex-1 overflow-y-auto p-4">
          {panelParticipant && campaign ? (
            <ActionPanel
              participant={panelParticipant}
              character={panelCharacter}
              campaignId={campaign.id}
              encounterId={activeEncounterId}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              {participants.length > 0
                ? "Select a participant to see actions"
                : "Waiting for participants…"}
            </div>
          )}
        </div>
      </div>

      {/* End encounter confirmation */}
      <Dialog open={confirmEnd} onOpenChange={setConfirmEnd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>End Encounter?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will mark the encounter as completed and unlock the encounter page for all players.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmEnd(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                await endEncounter();
                setConfirmEnd(false);
              }}
            >
              End Encounter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
