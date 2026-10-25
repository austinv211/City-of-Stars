import { useEffect, useState } from "react";
import { Flame, Skull, Swords, Shield, Timer, Trophy } from "lucide-react";
import { Button } from "@/core/components/ui/button";
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogContent,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/core/components/ui/responsive-dialog";
import type { EncounterParticipant } from "../../types/encounter.types";
import type { EncounterEvent } from "../../lib/events";
import { encounterHighlights, type Highlights } from "../../lib/highlights";

/**
 * End the encounter -- after a look back at it. Replaces a bare "End
 * Encounter?" confirm with the fight's highlights, from the event log and
 * the roll log.
 */
export function EndEncounterDialog({
  open,
  onOpenChange,
  loadEvents,
  participants,
  rolls,
  round,
  onEnd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loadEvents: () => Promise<EncounterEvent[]>;
  participants: EncounterParticipant[];
  rolls: { diceType?: string; result?: number }[];
  round: number;
  onEnd: () => Promise<void>;
}) {
  const [events, setEvents] = useState<EncounterEvent[] | null>(null);
  const [ending, setEnding] = useState(false);

  useEffect(() => {
    if (!open) return;
    let live = true;
    void loadEvents().then((e) => {
      if (live) setEvents(e);
    });
    return () => {
      live = false;
    };
  }, [open, loadEvents]);

  const h = events ? encounterHighlights(events, participants, rolls, round) : null;

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent widthClassName="md:max-w-md">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>End the encounter?</ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        <ResponsiveDialogBody className="space-y-3">
          {h ? (
            <HighlightGrid h={h} />
          ) : (
            <p className="text-sm text-muted-foreground">Tallying…</p>
          )}
          <p className="text-xs text-muted-foreground">
            This marks the encounter completed and unlocks the encounter page for all
            players.
          </p>
        </ResponsiveDialogBody>
        <ResponsiveDialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
            }}
          >
            Keep fighting
          </Button>
          <Button
            variant="destructive"
            disabled={ending}
            onClick={() => {
              setEnding(true);
              void onEnd().finally(() => {
                setEnding(false);
                onOpenChange(false);
              });
            }}
          >
            End Encounter
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

function HighlightGrid({ h }: { h: Highlights }) {
  const tiles: { icon: React.ReactNode; label: string; value: string }[] = [
    {
      icon: <Timer className="h-4 w-4" />,
      label: "Rounds",
      value: String(h.rounds),
    },
    {
      icon: <Trophy className="h-4 w-4" />,
      label: "Biggest hit",
      value: h.biggestHit
        ? `${String(h.biggestHit.amount)} on ${h.biggestHit.target}`
        : "—",
    },
    {
      icon: <Swords className="h-4 w-4" />,
      label: "Damage dealt",
      value: String(h.damageDealt),
    },
    {
      icon: <Shield className="h-4 w-4" />,
      label: "Damage taken",
      value: String(h.damageTaken),
    },
    {
      icon: <Flame className="h-4 w-4" />,
      label: "Crits / fumbles",
      value: `${String(h.crits)} / ${String(h.fumbles)}`,
    },
    {
      icon: <Skull className="h-4 w-4" />,
      label: "Dropped",
      value: h.downed.length ? h.downed.join(", ") : "No one",
    },
  ];
  return (
    <dl className="grid grid-cols-2 gap-2">
      {tiles.map((t) => (
        <div
          key={t.label}
          className="space-y-1 border border-border/40 bg-muted/20 p-2.5"
        >
          <dt className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
            {t.icon}
            {t.label}
          </dt>
          <dd className="truncate text-sm font-semibold" title={t.value}>
            {t.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
