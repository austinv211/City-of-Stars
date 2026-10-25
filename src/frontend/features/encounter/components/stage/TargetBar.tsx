import { Crosshair, Droplets, Shield, X } from "lucide-react";
import { Button } from "@/core/components/ui/button";
import { cn } from "@/lib/utils";
import type { TargetInfo } from "../../lib/attack";

/**
 * The current target, slim, above the action area: who, AC and HP -- as far
 * as the viewer may know. The DM sees numbers; a player sees a monster's
 * Bloodied state only, as on its initiative card.
 */
export function TargetBar({
  target,
  onChange,
  onClear,
}: {
  target: TargetInfo;
  /** Opens the target picker. */
  onChange?: () => void;
  onClear: () => void;
}) {
  const p = target.participant;
  const showNumbers = target.ac !== null;
  const bloodied = p.hp_max > 0 && p.hp_current * 2 <= p.hp_max;
  const down = p.hp_current <= 0;

  return (
    <div
      className="flex items-center gap-2 border border-destructive/40 bg-destructive/5 px-2.5 py-1.5 text-xs"
      aria-label={`Target: ${p.name}`}
    >
      <Crosshair className="h-4 w-4 shrink-0 text-destructive" />
      <span className="min-w-0 truncate font-semibold text-foreground">{p.name}</span>
      {showNumbers && (
        <span className="flex shrink-0 items-center gap-1 text-muted-foreground">
          <Shield className="h-3 w-3" /> AC {target.ac}
        </span>
      )}
      {target.totalCover && (
        <span className="shrink-0 text-secondary">Total cover</span>
      )}
      {showNumbers ? (
        <span
          className={cn(
            "shrink-0",
            down ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {p.hp_current}/{p.hp_max} HP
        </span>
      ) : (
        (bloodied || down) && (
          <span className="flex shrink-0 items-center gap-1 text-destructive">
            <Droplets className="h-3 w-3" /> {down ? "Down" : "Bloodied"}
          </span>
        )
      )}
      {onChange && (
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto h-7 shrink-0 px-2 text-xs"
          onClick={onChange}
        >
          Change
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon"
        className={cn("h-7 w-7 shrink-0", !onChange && "ml-auto")}
        onClick={onClear}
        aria-label="Clear target"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
