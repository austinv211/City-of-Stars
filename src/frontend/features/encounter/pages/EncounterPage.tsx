import { useState } from "react";
import { Swords } from "lucide-react";
import { useBreakpoint } from "@/core/hooks/useBreakpoint";
import { RulesLookup } from "@/features/rules/components/RulesLookup";
import { InitiativeRollScreen } from "../components/InitiativeRollScreen";
import { AddEffectDialog } from "../components/stage/AddEffectDialog";
import {
  EncounterDesktop,
  EncounterPhone,
  EncounterTablet,
  type LayoutProps,
} from "../components/screen/EncounterLayouts";
import { TargetPicker } from "../components/screen/TargetPicker";
import { EndEncounterDialog } from "../components/screen/EndEncounterDialog";
import { useEncounterScreen } from "../hooks/useEncounterScreen";

/**
 * The encounter screen: data wiring, the pre-combat gates, the dialogs, and
 * which of the three layouts to show.
 *
 * Layout is chosen with useBreakpoint rather than CSS alone because the
 * layouts arrange stateful regions differently (the action panel holds its own
 * realtime subscriptions); rendering every arrangement and hiding all but one
 * would mount those subscriptions three times.
 */
export default function EncounterPage({
  playerMode = false,
}: {
  playerMode?: boolean;
}) {
  const screen = useEncounterScreen(playerMode);
  const { isPhone, isTablet } = useBreakpoint();
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [addEffectOpen, setAddEffectOpen] = useState(false);
  const [targetPickerOpen, setTargetPickerOpen] = useState(false);

  if (screen.loading || screen.waitingForPlayerData) return <Spinner />;

  if (!screen.encounter || !screen.encounterId) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <Swords className="h-16 w-16 text-muted-foreground opacity-40" />
        <p className="text-muted-foreground">No active encounter</p>
      </div>
    );
  }

  // Players who have not rolled initiative yet see the waiting-room roll screen.
  const own = screen.ownParticipant;
  if (!screen.isDM && own && !own.has_rolled_initiative && screen.campaign) {
    return (
      <InitiativeRollScreen
        encounterId={screen.encounterId}
        campaignId={screen.campaign.id}
        participants={screen.participants}
        ownParticipant={own}
      />
    );
  }

  const layout: LayoutProps = {
    screen,
    onRules: () => {
      setRulesOpen(true);
    },
    onEnd: () => {
      setConfirmEnd(true);
    },
    onAddEffect: () => {
      setAddEffectOpen(true);
    },
    onChooseTarget: () => {
      setTargetPickerOpen(true);
    },
  };
  const panelId = screen.panelParticipant?.id ?? null;

  return (
    <>
      {isPhone ? (
        <EncounterPhone {...layout} />
      ) : isTablet ? (
        <EncounterTablet {...layout} />
      ) : (
        <EncounterDesktop {...layout} />
      )}

      <EndEncounterDialog
        open={confirmEnd}
        onOpenChange={setConfirmEnd}
        loadEvents={screen.log.fetchAll}
        participants={screen.participants}
        rolls={screen.history}
        round={screen.encounter.round}
        onEnd={screen.endEncounter}
      />

      <AddEffectDialog
        // Re-mount per selection so the default target follows it.
        key={panelId ?? "none"}
        open={addEffectOpen}
        onOpenChange={setAddEffectOpen}
        participants={screen.participants}
        fixedSourceId={screen.isDM ? null : (own?.id ?? null)}
        defaultTargetId={panelId}
        onAdd={screen.effects.addEffect}
      />

      <TargetPicker
        open={targetPickerOpen}
        onOpenChange={setTargetPickerOpen}
        participants={screen.participants}
        isDM={screen.isDM}
        ownId={own?.id ?? null}
        currentId={screen.targetId}
        onPick={screen.setTargetId}
      />

      <RulesLookup
        open={rulesOpen}
        onClose={() => {
          setRulesOpen(false);
        }}
      />
    </>
  );
}

function Spinner() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
    </div>
  );
}
