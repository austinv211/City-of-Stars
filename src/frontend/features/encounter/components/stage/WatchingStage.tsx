import { ChevronDown, Shield, Zap } from "lucide-react";
import { Button } from "@/core/components/ui/button";
import { cn } from "@/lib/utils";
import type { EncounterParticipant } from "../../types/encounter.types";
import type { Slot } from "../../lib/encounterStage";
import { CLASS_REACTIONS, UNIVERSAL_REACTIONS } from "./actionCatalog";
import type { CombatRolls } from "./useCombatRolls";

/**
 * Someone else's turn. Low energy on purpose: who is acting, your vitals, and
 * -- if your reaction is unspent -- that reaction as the one bright control,
 * since it is the only thing you can do until your turn. The full sheet is
 * one tap away.
 */
export function WatchingStage({
  own,
  active,
  reaction,
  characterClass,
  rolls,
  onShowSheet,
}: {
  own: EncounterParticipant;
  active: EncounterParticipant | null;
  reaction: Slot;
  characterClass: string;
  rolls: CombatRolls;
  onShowSheet: () => void;
}) {
  const reactions = [
    ...UNIVERSAL_REACTIONS,
    ...(CLASS_REACTIONS[characterClass] ?? []),
  ];
  const hpPct =
    own.hp_max > 0 ? Math.max(0, Math.min(1, own.hp_current / own.hp_max)) : 0;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {active ? (
          <>
            <span className="font-semibold text-foreground">{active.name}</span> is
            acting.
          </>
        ) : (
          "Waiting for the first turn."
        )}
      </p>

      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-semibold">
            {own.hp_current} / {own.hp_max} HP
            {own.hp_temp > 0 && (
              <span className="text-primary"> +{own.hp_temp} temp</span>
            )}
          </span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Shield className="h-3 w-3" /> AC {own.ac}
          </span>
        </div>
        <div className="h-2 bg-muted" aria-hidden="true">
          <div
            className={cn("h-full", hpPct > 0.5 ? "bg-success" : "bg-destructive")}
            style={{ width: `${String(hpPct * 100)}%` }}
          />
        </div>
        {own.conditions.length > 0 && (
          <p className="text-xs text-secondary">{own.conditions.join(" · ")}</p>
        )}
      </div>

      <div
        className={cn(
          "space-y-2 border p-3",
          reaction.available
            ? "border-primary/60 bg-primary/10"
            : "border-border/40 opacity-70",
        )}
      >
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider">
          <Zap className={cn("h-3.5 w-3.5", reaction.available && "text-primary")} />
          {reaction.available
            ? "Reaction ready"
            : reaction.blockedBy
              ? `No reactions — ${reaction.blockedBy}`
              : "Reaction used — back at the start of your turn"}
        </p>
        {reaction.available && (
          <div className="flex flex-wrap gap-1.5">
            {reactions.map((r) => (
              <Button
                key={r.id}
                size="sm"
                onClick={() => {
                  rolls.spendAction(r.label, "reaction", r.id);
                }}
              >
                {r.label}
              </Button>
            ))}
          </div>
        )}
      </div>

      <Button
        variant="ghost"
        className="w-full justify-center gap-1 border border-border/40 text-muted-foreground"
        onClick={onShowSheet}
      >
        <ChevronDown className="h-4 w-4" /> Show my full sheet
      </Button>
    </div>
  );
}
