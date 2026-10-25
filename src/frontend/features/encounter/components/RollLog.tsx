import { Dices, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RollEntry } from "../context/DiceContext";

const ACTION_CATEGORY_STYLE = {
  action: {
    bg: "bg-primary/10",
    label: "Action",
    labelClass: "text-primary",
  },
  bonus: {
    bg: "bg-secondary/10",
    label: "Bonus",
    labelClass: "text-secondary",
  },
  reaction: {
    bg: "bg-accent/20",
    label: "Reaction",
    labelClass: "text-accent-foreground",
  },
  free: {
    bg: "bg-muted/20",
    label: "Free",
    labelClass: "text-muted-foreground",
  },
} as const;

/** The encounter's rolls and announced actions, newest first. */
export function RollLog({ entries }: { entries: RollEntry[] }) {
  const sign = (n: number) => (n >= 0 ? `+${n}` : String(n));

  if (entries.length === 0) {
    return (
      <div className="flex h-32 flex-col items-center justify-center gap-2 text-muted-foreground">
        <Dices className="h-8 w-8 opacity-30" />
        <p className="text-xs">No rolls yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {entries.map((entry) => {
        if (entry.kind === "action") {
          const cat = entry.actionCategory ?? "action";
          const style = ACTION_CATEGORY_STYLE[cat];
          return (
            <div
              key={entry.id}
              className={cn(
                "flex items-start gap-2 rounded-md px-3 py-2 text-xs",
                style.bg,
              )}
            >
              <Zap className={cn("mt-0.5 h-3 w-3 shrink-0", style.labelClass)} />
              <div className="min-w-0">
                <span className="font-medium">
                  {entry.rolledByDm
                    ? `DM — ${entry.characterName}`
                    : entry.characterName}
                </span>
                <span className="text-muted-foreground"> · </span>
                <span
                  className={cn(
                    "text-[10px] font-semibold uppercase tracking-wide",
                    style.labelClass,
                  )}
                >
                  {style.label}
                </span>
                <p className="mt-0.5 text-muted-foreground">{entry.actionText}</p>
              </div>
            </div>
          );
        }

        const isD20 = entry.diceType === "d20" || entry.diceType === "1d20";
        const isCrit = isD20 && entry.result === 20;
        const isFumble = isD20 && entry.result === 1;
        return (
          <div
            key={entry.id}
            className={cn(
              "rounded-md px-3 py-2 text-xs",
              isCrit && "bg-secondary/10",
              isFumble && "bg-destructive/10",
              entry.advantage && !isCrit && !isFumble && "bg-success/10",
              entry.disadvantage && !isCrit && !isFumble && "bg-destructive/8",
              !isCrit &&
                !isFumble &&
                !entry.advantage &&
                !entry.disadvantage &&
                "bg-muted/40",
            )}
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate font-medium">
                {entry.rolledByDm ? `DM — ${entry.characterName}` : entry.characterName}
              </span>
              <span
                className={cn(
                  "shrink-0 text-base font-black",
                  isCrit && "text-secondary",
                  isFumble && "text-destructive",
                  entry.advantage && !isCrit && !isFumble && "text-success",
                  entry.disadvantage && !isCrit && !isFumble && "text-destructive",
                  !isCrit &&
                    !isFumble &&
                    !entry.advantage &&
                    !entry.disadvantage &&
                    "text-foreground",
                )}
              >
                {entry.total}
              </span>
            </div>
            <div className="mt-0.5 text-muted-foreground">
              {entry.rollType} · {entry.diceType}
              {entry.modifier !== 0 && (
                <span className="ml-1">
                  ({entry.result}
                  {sign(entry.modifier)})
                </span>
              )}
              {entry.discardedRoll != null && (
                <span className="ml-1 opacity-60">
                  [kept {entry.result}, dropped {entry.discardedRoll}]
                </span>
              )}
              {isCrit && (
                <span className="ml-1 font-semibold text-secondary">CRIT!</span>
              )}
              {isFumble && (
                <span className="ml-1 font-semibold text-destructive">FAIL</span>
              )}
              {entry.advantage && !isCrit && (
                <span className="ml-1 font-semibold text-success">ADV</span>
              )}
              {entry.disadvantage && !isFumble && (
                <span className="ml-1 font-semibold text-destructive">DIS</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
