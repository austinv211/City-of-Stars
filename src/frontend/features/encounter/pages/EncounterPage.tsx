import { useState, useEffect } from "react";
import { Button } from "@/core/components/ui/button";
import { Badge } from "@/core/components/ui/badge";
import { Separator } from "@/core/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/core/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/core/components/ui/dialog";
import { InitiativeTracker } from "../components/InitiativeTracker";
import { ActionPanel } from "../components/ActionPanel";
import { CharacterQuickRef } from "../components/CharacterQuickRef";
import { useActiveEncounter } from "../hooks/useActiveEncounter";
import { useEncounterParticipants } from "../hooks/useEncounterParticipants";
import { useCampaign } from "@/core/context/CampaignContext";
import { useCharacter } from "@/features/characters/hooks/useCharacter";
import { useCharacters } from "@/features/characters/hooks/useCharacters";
import { useAuth } from "@/core/context/AuthContext";
import { useDice } from "../context/DiceContext";
import { supabase } from "@/lib/supabase";
import { Swords, SkipForward, AlertCircle, Dices, User } from "lucide-react";
import type { CharacterAttack } from "@/features/characters/types/character.types";
import type { RollEntry } from "../context/DiceContext";
import { cn } from "@/lib/utils";

function RollLog({ entries }: { entries: RollEntry[] }) {
  const sign = (n: number) => (n >= 0 ? `+${n}` : String(n));

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-32 gap-2 text-muted-foreground">
        <Dices className="h-8 w-8 opacity-30" />
        <p className="text-xs">No rolls yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {entries.map((entry) => {
        const isCrit   = entry.diceType === "d20" && entry.result === 20;
        const isFumble = entry.diceType === "d20" && entry.result === 1;
        return (
          <div
            key={entry.id}
            className={cn(
              "rounded-md px-3 py-2 text-xs border",
              isCrit   && "border-yellow-400/50 bg-yellow-500/5",
              isFumble && "border-red-400/50   bg-red-500/5",
              !isCrit && !isFumble && "border-transparent bg-muted/40",
            )}
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-medium truncate">{entry.characterName}</span>
              <span
                className={cn(
                  "text-base font-black shrink-0",
                  isCrit   && "text-yellow-500",
                  isFumble && "text-red-500",
                  !isCrit && !isFumble && "text-foreground",
                )}
              >
                {entry.total}
              </span>
            </div>
            <div className="text-muted-foreground mt-0.5">
              {entry.rollType} · {entry.diceType}
              {entry.modifier !== 0 && (
                <span className="ml-1">({entry.result}{sign(entry.modifier)})</span>
              )}
              {isCrit   && <span className="ml-1 text-yellow-500 font-semibold">CRIT!</span>}
              {isFumble && <span className="ml-1 text-red-500 font-semibold">FAIL</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function EncounterPage() {
  const { user } = useAuth();
  const { campaign, isDM, activeEncounterId } = useCampaign();
  const { encounter, endEncounter, advanceTurn } = useActiveEncounter();
  const { participants, updateHP, updateConditions } = useEncounterParticipants(activeEncounterId);
  const { characters } = useCharacters();
  const { history: allHistory } = useDice();
  const history = allHistory.filter((e) => e.encounterId === activeEncounterId);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [attacks, setAttacks] = useState<CharacterAttack[]>([]);

  const ownCharacter = characters.find((c) => c.owner_id === user?.id && c.status === "active");
  const ownParticipant = participants.find((p) => p.character_id === ownCharacter?.id);

  const activeParticipantId = encounter?.current_participant_id ?? null;
  const isMyTurn = !!ownParticipant && ownParticipant.id === activeParticipantId;

  const panelParticipantId = selectedId ?? ownParticipant?.id ?? null;
  const panelParticipant = participants.find((p) => p.id === panelParticipantId);

  const { character: panelCharacter } = useCharacter(panelParticipant?.character_id ?? undefined);
  // Load own character with full scores for the quick reference panel
  const { character: ownCharacterFull } = useCharacter(!isDM ? ownCharacter?.id : undefined);

  useEffect(() => {
    async function load() {
      if (!panelParticipant?.character_id) { setAttacks([]); return; }
      const { data } = await supabase
        .from("character_attacks")
        .select("*")
        .eq("character_id", panelParticipant.character_id);
      setAttacks((data as CharacterAttack[]) ?? []);
    }
    load();
  }, [panelParticipant?.character_id]);

  if (!encounter || !activeEncounterId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Swords className="h-16 w-16 text-muted-foreground opacity-40" />
        <p className="text-muted-foreground">No active encounter</p>
      </div>
    );
  }

  const activeParticipant = participants.find((p) => p.id === activeParticipantId);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Header ── */}
      <div className="border-b px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap shrink-0">
        <div className="flex items-center gap-3">
          <Swords className="h-5 w-5 text-primary shrink-0" />
          <h1 className="font-bold">{encounter.name ?? "Encounter"}</h1>
          <Badge variant="default">Active</Badge>
          {activeParticipant && (
            <span className="text-sm text-muted-foreground hidden sm:block">
              Turn: <span className="font-medium text-foreground">{activeParticipant.name}</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isDM && (
            <Button variant="outline" size="sm" onClick={advanceTurn}>
              <SkipForward className="h-4 w-4 mr-1" />
              Next Turn
            </Button>
          )}
          {isDM && (
            <Button variant="destructive" size="sm" onClick={() => setConfirmEnd(true)}>
              End Encounter
            </Button>
          )}
        </div>
      </div>

      {/* ── "Your Turn" banner ── */}
      {isMyTurn && (
        <div className="bg-primary/10 border-b border-primary/20 px-4 py-1.5 flex items-center gap-2 shrink-0">
          <AlertCircle className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold text-primary">
            It's your turn, {ownCharacter?.name}!
          </p>
        </div>
      )}

      {/* ── Three-column body ── */}
      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* Col 1 — Initiative Tracker */}
        <div className="w-64 shrink-0 border-r overflow-y-auto p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
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

        {/* Col 2 — Action Panel */}
        <div className="flex-1 overflow-y-auto p-4 min-w-0">
          {panelParticipant && campaign ? (
            <ActionPanel
              participant={panelParticipant}
              character={panelCharacter}
              attacks={attacks}
              campaignId={campaign.id}
              encounterId={activeEncounterId}
              isMyTurn={isMyTurn && panelParticipant.id === ownParticipant?.id}
              isDM={isDM}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              {participants.length > 0
                ? "Select a participant to see actions"
                : "Waiting for participants…"}
            </div>
          )}
        </div>

        <Separator orientation="vertical" />

        {/* Col 3 — Roll Log / Character Sheet */}
        <div className="w-64 shrink-0 flex flex-col overflow-hidden border-l">
          {(() => {
            // DM sees selected player's character tab; player sees only their own
            const showCharTab =
              (!isDM && !!ownCharacterFull && !!ownParticipant) ||
              (!!isDM && !!panelCharacter && !!panelParticipant?.character_id);
            const charTabCharacter = isDM ? panelCharacter : ownCharacterFull;
            const charTabParticipant = isDM ? panelParticipant : ownParticipant;
            const charTabLabel = isDM ? (panelCharacter?.name ?? "Character") : "My Character";

            if (showCharTab && charTabCharacter && charTabParticipant) {
              return (
                <Tabs defaultValue="rolls" className="flex flex-col h-full">
                  <TabsList className="shrink-0 mx-3 mt-2 mb-0 h-7 text-xs">
                    <TabsTrigger value="rolls" className="text-xs h-5 flex items-center gap-1">
                      <Dices className="h-3 w-3" />
                      Rolls
                    </TabsTrigger>
                    <TabsTrigger value="character" className="text-xs h-5 flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {charTabLabel}
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="rolls" className="flex-1 overflow-y-auto p-3 mt-0">
                    <RollLog entries={history} />
                  </TabsContent>
                  <TabsContent value="character" className="flex-1 overflow-y-auto p-3 mt-0">
                    <CharacterQuickRef
                      character={charTabCharacter}
                      participant={charTabParticipant}
                      onUpdateHP={updateHP}
                    />
                  </TabsContent>
                </Tabs>
              );
            }

            return (
              <div className="flex flex-col h-full p-3 gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground shrink-0">
                  Roll Log (this encounter)
                </p>
                <div className="flex-1 min-h-0 overflow-y-auto">
                  <RollLog entries={history} />
                </div>
              </div>
            );
          })()}
        </div>

      </div>

      {/* ── End Encounter dialog ── */}
      <Dialog open={confirmEnd} onOpenChange={setConfirmEnd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>End Encounter?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will mark the encounter as completed and unlock the encounter page for all players.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmEnd(false)}>Cancel</Button>
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
