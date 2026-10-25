import { Crosshair } from "lucide-react";
import { Button } from "@/core/components/ui/button";
import { cn } from "@/lib/utils";
import type { DamageResult } from "../../hooks/useEncounterParticipants";
import { judgeAttack, type AttackVerdict, type TargetInfo } from "../../lib/attack";
import type { AttackOutcomeState, Rolled } from "./useAttackOutcome";

const VERDICT: Record<AttackVerdict, { label: string; className: string }> = {
  crit: { label: "Critical hit", className: "bg-secondary text-secondary-foreground" },
  hit: { label: "Hit", className: "bg-success/20 text-success" },
  miss: { label: "Miss", className: "bg-muted text-muted-foreground" },
  fumble: {
    label: "Miss (natural 1)",
    className: "bg-destructive/15 text-destructive",
  },
};

/**
 * "18 vs AC 15 — Hit", then "9 slashing — Apply to Goblin" for the DM.
 *
 * Players cannot write to a monster's row (RLS), and do not see its AC, so
 * for them this says what was rolled and leaves the call to the DM.
 */
export function AttackOutcome({
  outcome,
  target,
  damageType,
  onApplyDamage,
}: {
  outcome: AttackOutcomeState;
  target: TargetInfo | null;
  damageType: string;
  onApplyDamage?: (
    amount: number,
    type: string | null,
    crit: boolean,
  ) => Promise<DamageResult>;
}) {
  const { attack, damage, applied } = outcome;
  if (!attack && !damage) return null;
  const targetName = target?.participant.name;

  return (
    <div
      className="space-y-1.5 border-t border-border/40 pt-2 text-xs"
      aria-live="polite"
    >
      {attack && <AttackLine attack={attack} target={target} />}
      {damage && (
        <div className="flex flex-wrap items-center gap-2">
          <span>
            <span className="font-bold text-foreground">{damage.total}</span>{" "}
            <span className="text-muted-foreground">
              {damageType || "damage"}
              {damage.crit ? " (crit)" : ""}
            </span>
          </span>
          {applied ? (
            <AppliedNote result={applied} rolled={damage.total} name={targetName} />
          ) : (
            onApplyDamage &&
            target &&
            !target.totalCover && (
              <Button
                size="sm"
                variant="destructive"
                className="h-7 px-2 text-xs"
                onClick={() =>
                  void onApplyDamage(
                    damage.total,
                    damageType || null,
                    damage.crit,
                  ).then(outcome.setApplied)
                }
              >
                Apply to {targetName}
              </Button>
            )
          )}
        </div>
      )}
    </div>
  );
}

function AttackLine({ attack, target }: { attack: Rolled; target: TargetInfo | null }) {
  if (!target) {
    return (
      <p className="text-muted-foreground">
        Rolled <span className="font-bold text-foreground">{attack.total}</span> to hit.
        Tap <Crosshair className="inline h-3 w-3" /> on a combatant to target it.
      </p>
    );
  }
  if (target.totalCover) {
    return (
      <p className="text-secondary">
        {target.participant.name} has total cover — it can't be targeted directly.
      </p>
    );
  }
  if (target.ac === null) {
    return (
      <p className="text-muted-foreground">
        Rolled <span className="font-bold text-foreground">{attack.total}</span> against{" "}
        {target.participant.name} — the DM will call it.
      </p>
    );
  }
  const verdict = VERDICT[judgeAttack(attack.total, attack.modifier, target.ac)];
  return (
    <p className="flex flex-wrap items-center gap-2">
      <span className="text-muted-foreground">
        <span className="font-bold text-foreground">{attack.total}</span> vs AC{" "}
        {target.ac}
      </span>
      <span
        className={cn(
          "px-1.5 py-0.5 font-bold uppercase tracking-wide",
          verdict.className,
        )}
      >
        {verdict.label}
      </span>
    </p>
  );
}

function AppliedNote({
  result,
  rolled,
  name,
}: {
  result: DamageResult;
  rolled: number;
  name: string | undefined;
}) {
  return (
    <span className="text-muted-foreground">
      {name} took {result.dealt}
      {result.dealt !== rolled && " after defenses"}
      {result.instantDeath ? " — killed outright" : result.dropped ? " — down!" : ""}
      {result.concentrationDC !== null &&
        ` · Concentration DC ${String(result.concentrationDC)}`}
    </span>
  );
}
