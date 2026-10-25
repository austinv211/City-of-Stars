import { Crosshair, Droplets, Shield } from "lucide-react";
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/core/components/ui/responsive-dialog";
import { cn } from "@/lib/utils";
import { targetInfo } from "../../lib/attack";
import type { EncounterParticipant } from "../../types/encounter.types";

/**
 * Choose a target from a list of full-width rows -- the touch-sized way in.
 * The crosshair on each initiative card does the same job with a mouse, but a
 * 28px icon inside a card is not a phone control.
 */
export function TargetPicker({
  open,
  onOpenChange,
  participants,
  isDM,
  ownId,
  currentId,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  participants: EncounterParticipant[];
  isDM: boolean;
  /** The viewer's own combatant, listed last: you rarely target yourself. */
  ownId: string | null;
  currentId: string | null;
  onPick: (id: string) => void;
}) {
  const ordered = [
    ...participants.filter((p) => p.id !== ownId),
    ...participants.filter((p) => p.id === ownId),
  ];

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent widthClassName="md:max-w-md">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Choose a target</ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        <ResponsiveDialogBody>
          <ul className="divide-y divide-border/40 border border-border/40">
            {ordered.map((p) => (
              <li key={p.id}>
                <TargetRow
                  participant={p}
                  isDM={isDM}
                  isOwn={p.id === ownId}
                  selected={p.id === currentId}
                  onPick={() => {
                    onPick(p.id);
                    onOpenChange(false);
                  }}
                />
              </li>
            ))}
          </ul>
        </ResponsiveDialogBody>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

function TargetRow({
  participant: p,
  isDM,
  isOwn,
  selected,
  onPick,
}: {
  participant: EncounterParticipant;
  isDM: boolean;
  isOwn: boolean;
  selected: boolean;
  onPick: () => void;
}) {
  const info = targetInfo(isDM, p);
  const down = p.hp_current <= 0;
  const bloodied = !down && p.hp_max > 0 && p.hp_current * 2 <= p.hp_max;

  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={selected}
      className={cn(
        "flex min-h-14 w-full items-center gap-3 px-3 py-2 text-left transition-colors active:bg-accent/40",
        selected ? "bg-destructive/10" : "hover:bg-accent/20",
      )}
    >
      <Crosshair
        className={cn(
          "h-4 w-4 shrink-0",
          selected ? "text-destructive" : "text-muted-foreground",
        )}
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">
          {p.name}
          {isOwn && <span className="text-muted-foreground"> (you)</span>}
        </span>
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          {info.ac !== null && (
            <span className="flex items-center gap-1">
              <Shield className="h-3 w-3" /> AC {info.ac}
            </span>
          )}
          {info.totalCover && <span className="text-secondary">Total cover</span>}
          {(down || bloodied) && (
            <span className="flex items-center gap-1 text-destructive">
              <Droplets className="h-3 w-3" /> {down ? "Down" : "Bloodied"}
            </span>
          )}
        </span>
      </span>
    </button>
  );
}
