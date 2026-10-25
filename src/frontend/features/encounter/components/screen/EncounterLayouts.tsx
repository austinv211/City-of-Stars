import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/core/components/ui/tabs";
import { Sheet, SheetContent, SheetTitle } from "@/core/components/ui/sheet";
import type { EncounterScreen } from "../../hooks/useEncounterScreen";
import {
  CompactEncounterHeader,
  DmCommandBar,
  EncounterHeader,
} from "./EncounterHeader";
import { Filmstrip } from "./Filmstrip";
import { SideRegion } from "./SideRegion";
import { StageRegion } from "./StageRegion";
import { TrackerRegion } from "./TrackerRegion";

/**
 * §3.4: three layouts, one set of regions. The page picks one by breakpoint;
 * each arranges the same TrackerRegion / StageRegion / SideRegion.
 */

export interface LayoutProps {
  screen: EncounterScreen;
  onRules: () => void;
  onEnd: () => void;
  onAddEffect: () => void;
  onChooseTarget: () => void;
}

const stageScroll = "min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-3";

/** >= 1280px: initiative, stage, log -- 280px / flexible / 320px. */
export function EncounterDesktop(props: LayoutProps) {
  const { screen } = props;
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <EncounterHeader screen={screen} onRules={props.onRules} onEnd={props.onEnd} />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside
          data-scroll-container
          className="w-[280px] shrink-0 overflow-y-auto border-r border-border/40 bg-card p-2"
        >
          <TrackerRegion screen={screen} />
        </aside>
        <main data-scroll-container className={`${stageScroll} min-w-0 bg-card`}>
          <StageRegion
            screen={screen}
            onAddEffect={props.onAddEffect}
            onChooseTarget={props.onChooseTarget}
          />
        </main>
        <aside className="w-80 shrink-0 overflow-hidden border-l border-border/40 bg-card">
          <SideRegion screen={screen} />
        </aside>
      </div>
    </div>
  );
}

/** 768-1279px: initiative rail and stage; the log slides over from the right. */
export function EncounterTablet(props: LayoutProps) {
  const { screen } = props;
  const [sideOpen, setSideOpen] = useState(false);
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <EncounterHeader
        screen={screen}
        onRules={props.onRules}
        onEnd={props.onEnd}
        onOpenSide={() => {
          setSideOpen(true);
        }}
      />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside
          data-scroll-container
          className="w-72 shrink-0 overflow-y-auto border-r border-border/40 bg-card p-2"
        >
          <TrackerRegion screen={screen} />
        </aside>
        <main data-scroll-container className={`${stageScroll} min-w-0 bg-card`}>
          <StageRegion
            screen={screen}
            onAddEffect={props.onAddEffect}
            onChooseTarget={props.onChooseTarget}
          />
        </main>
      </div>
      <Sheet open={sideOpen} onOpenChange={setSideOpen}>
        <SheetContent side="right" className="w-[22rem] gap-0 p-0 pt-[var(--safe-top)]">
          <SheetTitle className="sr-only">Rolls and character</SheetTitle>
          <div className="h-full pt-10">
            <SideRegion screen={screen} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

type PhoneTab = "turn" | "party" | "log";

/**
 * < 768px: the turn bar, the initiative filmstrip (so the order never
 * scrolls away), then Turn / Party / Log. The DM's controls sit at the foot.
 */
export function EncounterPhone(props: LayoutProps) {
  const { screen } = props;
  const [tab, setTab] = useState<PhoneTab>("turn");
  const showOnTurn = (id: string) => {
    screen.setSelectedId(id);
    setTab("turn");
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <CompactEncounterHeader screen={screen} onRules={props.onRules} />
      <Filmstrip
        participants={screen.participants}
        activeId={screen.encounter?.current_participant_id ?? null}
        selectedId={screen.panelParticipant?.id ?? null}
        targetId={screen.targetId}
        ownId={screen.ownParticipant?.id ?? null}
        isDM={screen.isDM}
        onSelect={showOnTurn}
      />
      <Tabs
        value={tab}
        onValueChange={(v) => {
          setTab(v as PhoneTab);
        }}
        className="flex min-h-0 flex-1 flex-col"
      >
        <TabsList className="mx-2 mt-2 grid h-11 shrink-0 grid-cols-3">
          <TabsTrigger value="turn">Turn</TabsTrigger>
          <TabsTrigger value="party">Party</TabsTrigger>
          <TabsTrigger value="log">Log</TabsTrigger>
        </TabsList>
        <TabsContent
          value="turn"
          data-scroll-container
          className={`${stageScroll} mt-0`}
        >
          <StageRegion
            screen={screen}
            onAddEffect={props.onAddEffect}
            onChooseTarget={props.onChooseTarget}
          />
        </TabsContent>
        <TabsContent
          value="party"
          data-scroll-container
          className="mt-0 min-h-0 flex-1 overflow-y-auto p-2"
        >
          <TrackerRegion screen={screen} onSelect={showOnTurn} />
        </TabsContent>
        <TabsContent value="log" className="mt-0 min-h-0 flex-1 overflow-hidden">
          <SideRegion screen={screen} />
        </TabsContent>
      </Tabs>
      {screen.isDM && <DmCommandBar screen={screen} onEnd={props.onEnd} />}
    </div>
  );
}
