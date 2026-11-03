import { Crosshair, Shield } from "lucide-react";
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/core/components/ui/responsive-dialog";
import { cn } from "@/lib/utils";
import { targetInfo } from "../../lib/attack";
import { WoundBadge } from "../stage/WoundBadge";
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
  actor,
  currentId,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  participants: EncounterParticipant[];
  isDM: boolean;
  /** The combatant aiming; not listed, since it can't target itself. */
  actor: EncounterParticipant | null;
  currentId: string | null;
  onPick: (id: string) => void;
}) {
  const choices = participants.filter((p) => p.id !== actor?.id);
  // The DM aims for many combatants, so say whose target this is.
  const title = isDM && actor ? `Choose ${actor.name}'s target` : "Choose a target";

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent widthClassName="md:max-w-md">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{title}</ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        <ResponsiveDialogBody>
          <ul className="divide-y divide-border/40 border border-border/40">
            {choices.map((p) => (
              <li key={p.id}>
                <TargetRow
                  participant={p}
                  isDM={isDM}
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
  selected,
  onPick,
}: {
  participant: EncounterParticipant;
  isDM: boolean;
  selected: boolean;
  onPick: () => void;
}) {
  const info = targetInfo(isDM, p);

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
        </span>
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          {info.ac !== null && (
            <span className="flex items-center gap-1">
              <Shield className="h-3 w-3" /> AC {info.ac}
            </span>
          )}
          {info.totalCover && <span className="text-secondary">Total cover</span>}
          <WoundBadge participant={p} />
        </span>
      </span>
    </button>
  );
}
