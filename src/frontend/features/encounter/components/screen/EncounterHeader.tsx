import { BookOpen, ChevronLeft, PanelRight, SkipForward, Swords } from "lucide-react";
import { useNavigate } from "react-router";
import { Badge } from "@/core/components/ui/badge";
import { Button } from "@/core/components/ui/button";
import { TurnBar } from "../stage/TurnBar";
import type { EncounterScreen } from "../../hooks/useEncounterScreen";

interface Props {
  screen: EncounterScreen;
  onRules: () => void;
  onEnd: () => void;
  /** Tablet only: open the roll log / character sheet slide-over. */
  onOpenSide?: () => void;
}

/** Name, turn bar, and the DM's turn controls, in one row (tablet and desktop). */
export function EncounterHeader({ screen, onRules, onEnd, onOpenSide }: Props) {
  const { isDM, stage } = screen;
  return (
    <div className="flex h-12 shrink-0 items-center gap-3 border-b border-border/40 bg-card px-3">
      <EncounterTitle screen={screen} />
      <div className="min-w-0 flex-1">{stage && <TurnBar stage={stage} />}</div>
      <Button variant="ghost" size="sm" onClick={onRules} title="Rules Reference">
        <BookOpen className="h-4 w-4" />
      </Button>
      {onOpenSide && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onOpenSide}
          title="Rolls & character"
        >
          <PanelRight className="h-4 w-4" />
        </Button>
      )}
      {isDM && (
        <>
          <Button variant="outline" size="sm" onClick={() => void screen.advanceTurn()}>
            <SkipForward className="mr-1 h-4 w-4" />
            Next Turn
          </Button>
          <Button variant="destructive" size="sm" onClick={onEnd}>
            End<span className="hidden lg:inline">&nbsp;Encounter</span>
          </Button>
        </>
      )}
    </div>
  );
}

/** The phone's header: back, the turn bar, and the rules -- nothing else fits. */
export function CompactEncounterHeader({
  screen,
  onRules,
}: Pick<Props, "screen" | "onRules">) {
  const navigate = useNavigate();
  return (
    <div className="flex h-12 shrink-0 items-center gap-1 border-b border-border/40 bg-card px-1">
      {!screen.playerMode && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => void navigate("/dm/encounters")}
          aria-label="Back to Encounters"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
      )}
      <div className="min-w-0 flex-1 px-1">
        {screen.stage && <TurnBar stage={screen.stage} />}
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={onRules}
        aria-label="Rules Reference"
      >
        <BookOpen className="h-5 w-5" />
      </Button>
    </div>
  );
}

function EncounterTitle({ screen }: { screen: EncounterScreen }) {
  const navigate = useNavigate();
  return (
    <div className="flex min-w-0 shrink items-center gap-2 lg:w-64 lg:shrink-0">
      {!screen.playerMode && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={() => void navigate("/dm/encounters")}
          title="Back to Encounters"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      )}
      <Swords className="h-4 w-4 shrink-0 text-primary" />
      {/* Below lg the turn bar needs the room more than the name does. */}
      <h1 className="hidden truncate text-sm font-bold lg:block">
        {screen.encounter?.name ?? "Encounter"}
      </h1>
      <Badge className="hidden h-5 shrink-0 border-success/40 bg-success/20 text-[10px] text-success lg:inline-flex">
        Active
      </Badge>
    </div>
  );
}

/**
 * The DM's turn controls on a phone: a full-width bar at the foot of the
 * encounter, where the thumb is, instead of buttons squeezed into the header.
 */
export function DmCommandBar({ screen, onEnd }: Pick<Props, "screen" | "onEnd">) {
  return (
    <div className="flex shrink-0 gap-2 border-t border-border/40 bg-card p-2">
      <Button
        variant="ghost"
        className="h-11 shrink-0 border border-destructive/50 text-destructive"
        onClick={onEnd}
      >
        End
      </Button>
      <Button className="h-11 flex-1 gap-2" onClick={() => void screen.advanceTurn()}>
        <SkipForward className="h-4 w-4" />
        Next Turn
      </Button>
    </div>
  );
}
