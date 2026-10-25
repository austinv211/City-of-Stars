import { ChevronLeft, Crosshair } from "lucide-react";
import { Button } from "@/core/components/ui/button";
import { ActionPanel } from "../ActionPanel";
import { SpectatorRollPanel } from "../SpectatorRollPanel";
import { EffectsTray } from "../stage/EffectsTray";
import { TargetBar } from "../stage/TargetBar";
import type { EncounterScreen } from "../../hooks/useEncounterScreen";
import { OwnStage } from "./OwnStage";

/**
 * The centre of the screen: effects, the current target, and the action
 * panel of whoever is selected (the viewer's own combatant by default).
 */
export function StageRegion({
  screen,
  onAddEffect,
  onChooseTarget,
}: {
  screen: EncounterScreen;
  onAddEffect: () => void;
  onChooseTarget: () => void;
}) {
  const { isDM, ownParticipant, target, stage } = screen;

  return (
    <>
      {(isDM || ownParticipant) && (
        <div className="mb-3 border-b border-border/40 pb-3">
          <EffectsTray
            effects={screen.effects.effects}
            participants={screen.participants}
            own={stage?.own ?? null}
            isDM={isDM}
            onRemove={(id) => void screen.effects.removeEffect(id)}
            onAdd={onAddEffect}
          />
        </div>
      )}
      {screen.canTarget && (
        <div className="mb-3">
          {target ? (
            <TargetBar
              target={target}
              onChange={onChooseTarget}
              onClear={() => {
                screen.setTargetId(null);
              }}
            />
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 border border-dashed border-border text-muted-foreground"
              onClick={onChooseTarget}
            >
              <Crosshair className="h-4 w-4" /> Choose a target
            </Button>
          )}
        </div>
      )}
      <PanelArea screen={screen} />
    </>
  );
}

function PanelArea({ screen }: { screen: EncounterScreen }) {
  const { campaign, encounterId, panelParticipant, isSpectator, isDM, combat, target } =
    screen;
  if (!campaign || !encounterId) return null;

  // Spectators default to a personal roll panel. Selecting someone shows
  // that combatant's panel read-only, with a way back.
  if (isSpectator && !screen.selectedId) {
    return (
      <SpectatorRollPanel
        campaignId={campaign.id}
        encounterId={encounterId}
        spectatorName={screen.spectatorName}
        isDM={false}
      />
    );
  }

  if (!panelParticipant) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        {screen.participants.length > 0
          ? "Select a participant to see actions"
          : "Waiting for participants…"}
      </div>
    );
  }

  const id = panelParticipant.id;
  const panel = ({ secondaryCollapsed }: { secondaryCollapsed: boolean }) => (
    <ActionPanel
      participant={panelParticipant}
      character={screen.panelCharacter}
      attacks={screen.attacks}
      campaignId={campaign.id}
      encounterId={encounterId}
      isDM={isDM}
      canControl={screen.canControlPanel}
      onSetConcentration={(spell) => void combat.setConcentration(id, spell)}
      onSetHeroicInspiration={(v) => void combat.setHeroicInspiration(id, v)}
      onSetCover={(cover) => void combat.setCover(id, cover)}
      onSetTurnFlag={(flag, v) => void combat.setTurnFlag(id, flag, v)}
      target={target}
      onApplyDamage={
        isDM && target
          ? (amount, type, crit) =>
              combat.applyDamage(target.participant.id, amount, type, { crit })
          : undefined
      }
      secondaryCollapsed={secondaryCollapsed}
    />
  );

  // A player looking at their own combatant gets the phase-driven stage.
  const own = screen.ownParticipant;
  if (!isDM && own?.id === id) {
    return <OwnStage screen={screen} own={own} panel={panel} />;
  }

  return (
    <>
      {isSpectator && (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-1 mb-3"
          onClick={() => {
            screen.setSelectedId(null);
          }}
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back to my rolls
        </Button>
      )}
      {panel({ secondaryCollapsed: false })}
    </>
  );
}
