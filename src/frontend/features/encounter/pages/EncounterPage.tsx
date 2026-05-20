import { useState, useEffect } from "react";
import { Button } from "@/core/components/ui/button";
import { Badge } from "@/core/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/core/components/ui/tabs";
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
import { Swords, SkipForward, Dices, User, BookOpen, Zap } from "lucide-react";
import { RulesLookup } from "@/features/rules/components/RulesLookup";
import type { CharacterAttack } from "@/features/characters/types/character.types";
import type { RollEntry } from "../context/DiceContext";
import { cn } from "@/lib/utils";

const ACTION_CATEGORY_STYLE = {
  action: {
    bg: "bg-ctp-blue/10",
    label: "Action",
    labelClass: "text-ctp-blue",
  },
  bonus: {
    bg: "bg-ctp-peach/10",
    label: "Bonus",
    labelClass: "text-ctp-peach",
  },
  reaction: {
    bg: "bg-ctp-mauve/10",
    label: "Reaction",
    labelClass: "text-ctp-mauve",
  },
  free: {
    bg: "bg-muted/20",
    label: "Free",
    labelClass: "text-muted-foreground",
  },
} as const;

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
        if (entry.kind === "action") {
          const cat = entry.actionCategory ?? "action";
          const style = ACTION_CATEGORY_STYLE[cat];
          return (
            <div
              key={entry.id}
              className={cn(
                "rounded-md px-3 py-2 text-xs flex items-start gap-2",
                style.bg,
              )}
            >
              <Zap
                className={cn("h-3 w-3 mt-0.5 shrink-0", style.labelClass)}
              />
              <div className="min-w-0">
                <span className="font-medium">{entry.characterName}</span>
                <span className="text-muted-foreground"> · </span>
                <span
                  className={cn(
                    "font-semibold text-[10px] uppercase tracking-wide",
                    style.labelClass,
                  )}
                >
                  {style.label}
                </span>
                <p className="text-muted-foreground mt-0.5">
                  {entry.actionText}
                </p>
              </div>
            </div>
          );
        }

        const isD20 = entry.diceType === "d20" || entry.diceType === "1d20";
        const isCrit = isD20 && entry.result === 20;
        const isFumble = isD20 && entry.result === 1;
        return (
          <div
            key={entry.id}
            className={cn(
              "rounded-md px-3 py-2 text-xs",
              isCrit && "bg-ctp-yellow/10",
              isFumble && "bg-ctp-red/10",
              entry.advantage && !isCrit && !isFumble && "bg-ctp-green/8",
              entry.disadvantage && !isCrit && !isFumble && "bg-ctp-red/8",
              !isCrit &&
                !isFumble &&
                !entry.advantage &&
                !entry.disadvantage &&
                "bg-muted/40",
            )}
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-medium truncate">
                {entry.characterName}
              </span>
              <span
                className={cn(
                  "text-base font-black shrink-0",
                  isCrit && "text-ctp-yellow",
                  isFumble && "text-ctp-red",
                  entry.advantage && !isCrit && !isFumble && "text-ctp-green",
                  entry.disadvantage && !isCrit && !isFumble && "text-ctp-red",
                  !isCrit &&
                    !isFumble &&
                    !entry.advantage &&
                    !entry.disadvantage &&
                    "text-foreground",
                )}
              >
                {entry.total}
              </span>
            </div>
            <div className="text-muted-foreground mt-0.5">
              {entry.rollType} · {entry.diceType}
              {entry.modifier !== 0 && (
                <span className="ml-1">
                  ({entry.result}
                  {sign(entry.modifier)})
                </span>
              )}
              {entry.discardedRoll != null && (
                <span className="ml-1 opacity-60">
                  [{entry.advantage ? "kept" : "kept"} {entry.result}, dropped{" "}
                  {entry.discardedRoll}]
                </span>
              )}
              {isCrit && (
                <span className="ml-1 text-yellow-500 font-semibold">
                  CRIT!
                </span>
              )}
              {isFumble && (
                <span className="ml-1 text-red-500 font-semibold">FAIL</span>
              )}
              {entry.advantage && !isCrit && (
                <span className="ml-1 text-ctp-green font-semibold">ADV</span>
              )}
              {entry.disadvantage && !isFumble && (
                <span className="ml-1 text-ctp-red font-semibold">DIS</span>
              )}
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
  const { participants, updateHP, updateConditions } = useEncounterParticipants(
    activeEncounterId,
    campaign?.id,
  );
  const { characters } = useCharacters();
  const { history: allHistory } = useDice();
  const history = allHistory.filter((e) => e.encounterId === activeEncounterId);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [attacks, setAttacks] = useState<CharacterAttack[]>([]);

  const ownCharacter = characters.find(
    (c) => c.owner_id === user?.id && c.status === "active",
  );
  const ownParticipant = participants.find(
    (p) => p.character_id === ownCharacter?.id,
  );

  const activeParticipantId = encounter?.current_participant_id ?? null;
  const isMyTurn =
    !!ownParticipant && ownParticipant.id === activeParticipantId;

  const panelParticipantId = selectedId ?? ownParticipant?.id ?? null;
  const panelParticipant = participants.find(
    (p) => p.id === panelParticipantId,
  );

  const isPanelMyTurn = isMyTurn && panelParticipant?.id === ownParticipant?.id;

  const { character: panelCharacter } = useCharacter(
    panelParticipant?.character_id ?? undefined,
  );
  // Load own character with full scores for the quick reference panel
  const { character: ownCharacterFull } = useCharacter(
    !isDM ? ownCharacter?.id : undefined,
  );

  useEffect(() => {
    async function load() {
      if (!panelParticipant?.character_id) {
        setAttacks([]);
        return;
      }
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

  const activeParticipant = participants.find(
    (p) => p.id === activeParticipantId,
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Header — 3 zones aligned with columns below ── */}
      <div
        className="bg-card h-12 flex items-center shrink-0"
        style={{ boxShadow: "inset 0 -1px 0 hsl(var(--border)/0.3)" }}
      >
        {/* Zone 1 — w-64, aligns with Initiative column */}
        <div className="w-64 shrink-0 flex items-center gap-2 px-3">
          <Swords className="h-4 w-4 text-primary shrink-0" />
          <h1 className="font-bold text-sm truncate">
            {encounter.name ?? "Encounter"}
          </h1>
          <Badge className="shrink-0 text-[10px] h-5 bg-[hsl(var(--ctp-green)/0.18)] text-ctp-green border-[hsl(var(--ctp-green)/0.35)]">
            Active
          </Badge>
        </div>
        {/* Zone 2 — flex-1, aligns with Action Panel column */}
        <div className="flex-1 flex items-center px-4">
          {activeParticipant && (
            <span className="text-sm">
              <span className="text-muted-foreground">Turn: </span>
              <span className="font-semibold text-ctp-lavender">
                {activeParticipant.name}
              </span>
            </span>
          )}
        </div>
        {/* Zone 3 — w-64, aligns with Roll Log column */}
        <div className="w-64 shrink-0 flex items-center justify-end gap-2 px-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setRulesOpen(true)}
            title="Rules Reference"
          >
            <BookOpen className="h-4 w-4" />
          </Button>
          {isDM && (
            <Button variant="outline" size="sm" onClick={advanceTurn}>
              <SkipForward className="h-4 w-4 mr-1" />
              Next Turn
            </Button>
          )}
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
      </div>

      {/* ── "Your Turn" banner ── */}
      {isMyTurn && (
        <div className="encounter-turn-banner px-4 py-2 flex items-center gap-2.5 shrink-0">
          <Zap className="h-4 w-4 text-ctp-mauve shrink-0 animate-pulse" />
          <p className="text-sm font-bold">
            <span className="text-ctp-lavender">Your Turn</span>
            <span className="text-ctp-peach"> — {ownCharacter?.name}</span>
            <span className="text-ctp-lavender">!</span>
          </p>
        </div>
      )}

      {/* ── Three-column body ── */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Col 1 — Initiative Tracker */}
        <div
          className="w-64 shrink-0 flex flex-col bg-card"
          style={{ boxShadow: "inset -1px 0 0 hsl(var(--border)/0.3)" }}
        >
          <div className="flex-1 overflow-y-auto p-2 pt-2">
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
        </div>

        {/* Col 2 — Action Panel */}
        <div
          className={cn("flex-1 flex flex-col overflow-hidden min-w-0 bg-card")}
        >
          <div className="flex-1 overflow-y-auto px-4 pb-4 pt-2">
            {panelParticipant && campaign ? (
              <ActionPanel
                participant={panelParticipant}
                character={panelCharacter}
                attacks={attacks}
                campaignId={campaign.id}
                encounterId={activeEncounterId}
                isMyTurn={isPanelMyTurn}
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
        </div>

        {/* Col 3 — Roll Log / Character Sheet */}
        <div
          className="w-64 shrink-0 flex flex-col bg-card overflow-hidden"
          style={{ boxShadow: "inset 1px 0 0 hsl(var(--border)/0.3)" }}
        >
          {(() => {
            const showCharTab =
              (!isDM && !!ownCharacterFull && !!ownParticipant) ||
              (!!isDM && !!panelCharacter && !!panelParticipant?.character_id);
            const charTabCharacter = isDM ? panelCharacter : ownCharacterFull;
            const charTabParticipant = isDM ? panelParticipant : ownParticipant;
            const charTabLabel = isDM
              ? (panelCharacter?.name ?? "Character")
              : "My Character";

            if (showCharTab && charTabCharacter && charTabParticipant) {
              return (
                <Tabs defaultValue="rolls" className="flex flex-col h-full">
                  <TabsList className="shrink-0 mx-3 mt-2 h-11 text-xs">
                    <TabsTrigger
                      value="rolls"
                      className="text-xs h-9 w-full flex items-center gap-1"
                    >
                      <Dices className="h-3 w-3" />
                      Rolls
                    </TabsTrigger>
                    <TabsTrigger
                      value="character"
                      className="text-xs h-9 w-full flex items-center gap-1"
                    >
                      <User className="h-3 w-3" />
                      {charTabLabel}
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent
                    value="rolls"
                    className="flex-1 overflow-y-auto p-3 mt-0"
                  >
                    <RollLog entries={history} />
                  </TabsContent>
                  <TabsContent
                    value="character"
                    className="flex-1 overflow-y-auto p-3 mt-0"
                  >
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
              <div className="flex flex-col h-full">
                <div className="flex-1 min-h-0 overflow-y-auto p-3 pt-2">
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
            This will mark the encounter as completed and unlock the encounter
            page for all players.
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

      <RulesLookup open={rulesOpen} onClose={() => setRulesOpen(false)} />
    </div>
  );
}
