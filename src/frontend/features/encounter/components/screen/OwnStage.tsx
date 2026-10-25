import { useState } from "react";
import { SkipForward } from "lucide-react";
import { Button } from "@/core/components/ui/button";
import { DeathSaveStage } from "../stage/DeathSaveStage";
import { StageFrame } from "../stage/StageFrame";
import { WatchingStage } from "../stage/WatchingStage";
import { useCombatRolls } from "../stage/useCombatRolls";
import type { EncounterScreen } from "../../hooks/useEncounterScreen";
import type { EncounterParticipant } from "../../types/encounter.types";

/**
 * A player's own combatant, staged by phase (§3.1):
 *
 *   dying      death saves and nothing else
 *   watching   who is acting, your vitals, your reaction; the sheet on request
 *   on-deck    the full sheet, under a "plan your move" banner
 *   my-turn    economy and attacks first, the rest behind More, and End Turn
 */
export function OwnStage({
  screen,
  own,
  panel,
}: {
  screen: EncounterScreen;
  own: EncounterParticipant;
  /** The full action panel, built by the caller. */
  panel: (opts: { secondaryCollapsed: boolean }) => React.ReactNode;
}) {
  const stage = screen.stage;
  const activeId = screen.encounter?.current_participant_id ?? null;
  // "Show my full sheet" lasts for the turn it was asked for; the next turn
  // returns to the quiet view.
  const turnKey = `${String(stage?.round)}:${String(activeId)}`;
  const [expandedFor, setExpandedFor] = useState<string | null>(null);
  const rolls = useCombatRolls({
    participant: own,
    campaignId: screen.campaign?.id ?? "",
    encounterId: screen.encounterId ?? "",
    isDM: false,
    onSetTurnFlag: (flag, v) => void screen.combat.setTurnFlag(own.id, flag, v),
  });

  if (!stage) return null;
  const { phase } = stage;

  if (phase === "dying") {
    return (
      <StageFrame phase={phase}>
        <DeathSaveStage
          participant={own}
          isTheirTurn={activeId === own.id}
          onRoll={() => screen.rollDeathSave(own.id)}
        />
      </StageFrame>
    );
  }

  if (phase === "watching" && expandedFor !== turnKey && stage.economy) {
    return (
      <StageFrame phase={phase}>
        <WatchingStage
          own={own}
          active={stage.active}
          reaction={stage.economy.reaction}
          characterClass={screen.ownCharacterFull?.class ?? ""}
          rolls={rolls}
          onShowSheet={() => {
            setExpandedFor(turnKey);
          }}
        />
      </StageFrame>
    );
  }

  const myTurn = phase === "my-turn";
  return (
    <StageFrame phase={phase}>
      {panel({ secondaryCollapsed: myTurn })}
      {myTurn && (
        <div className="sticky bottom-0 -mx-3 -mb-3 mt-4 border-t border-border/40 bg-card p-3">
          <Button
            className="h-12 w-full gap-2 text-base"
            onClick={() => void screen.advanceTurn()}
          >
            <SkipForward className="h-5 w-5" /> End Turn
          </Button>
        </div>
      )}
    </StageFrame>
  );
}
