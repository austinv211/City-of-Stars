import {
  Dices,
  Flame,
  HeartPulse,
  Hourglass,
  Search,
  Shield,
  Swords,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { RollEntry } from "../../context/DiceContext";
import type { LogLine } from "../../lib/logLine";
import type { RollKind } from "../../types/encounter.types";
import { LogSourceCard } from "./LogSourceCard";

const KIND_ICON: Record<RollKind, LucideIcon> = {
  attack: Swords,
  damage: Flame,
  save: Shield,
  check: Search,
  initiative: Hourglass,
  death_save: HeartPulse,
  action: Zap,
  other: Dices,
};

const CATEGORY = {
  action: { label: "Action", className: "text-primary" },
  bonus: { label: "Bonus", className: "text-secondary" },
  reaction: { label: "Reaction", className: "text-accent-foreground" },
  free: { label: "Free", className: "text-muted-foreground" },
} as const;

const VERDICT = {
  crit: { label: "Crit", className: "bg-secondary text-secondary-foreground" },
  hit: { label: "Hit", className: "bg-success/20 text-success" },
  miss: { label: "Miss", className: "bg-muted text-muted-foreground" },
  fumble: { label: "Miss", className: "bg-destructive/15 text-destructive" },
} as const;

const BADGE = {
  crit: { label: "CRIT", className: "text-secondary" },
  fumble: { label: "NAT 1", className: "text-destructive" },
  adv: { label: "ADV", className: "text-success" },
  dis: { label: "DIS", className: "text-destructive" },
} as const;

function rowTint(line: LogLine) {
  if (line.badges.includes("crit")) return "bg-secondary/10";
  if (line.badges.includes("fumble")) return "bg-destructive/10";
  return "bg-muted/40";
}

/**
 * One log line: "Grizzle → Isolde", then the ability (hover for what it
 * does), the total, and for the DM the verdict against the target's AC.
 */
export function LogEntry({
  entry,
  line,
  viewerIsDM,
}: {
  entry: RollEntry;
  line: LogLine;
  viewerIsDM: boolean;
}) {
  const Icon = KIND_ICON[entry.kind === "action" ? "action" : (entry.context?.kind ?? "other")];
  const source = entry.context?.source;

  return (
    <li className={cn("flex gap-2 px-3 py-2 text-xs", rowTint(line))}>
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex items-baseline gap-1.5">
          <span className="min-w-0 truncate font-medium">
            {line.actor}
            {line.target && <span className="text-muted-foreground"> → {line.target}</span>}
          </span>
          {line.total !== null && (
            <span className="ml-auto shrink-0 text-base font-black">{line.total}</span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-muted-foreground">
          {source ? (
            <LogSourceCard source={source} actor={line.actorParticipant} viewerIsDM={viewerIsDM}>
              {line.title}
            </LogSourceCard>
          ) : (
            <span className="min-w-0 truncate text-foreground">{line.title}</span>
          )}
          {line.kind && <span>· {line.kind}</span>}
          {line.category && (
            <span
              className={cn(
                "text-[10px] font-semibold uppercase tracking-wide",
                CATEGORY[line.category].className,
              )}
            >
              · {CATEGORY[line.category].label}
            </span>
          )}
          {line.verdict && (
            <span className={cn("px-1 font-bold uppercase", VERDICT[line.verdict.verdict].className)}>
              vs AC {line.verdict.ac} · {VERDICT[line.verdict.verdict].label}
            </span>
          )}
          {line.badges.map((b) => (
            <span key={b} className={cn("font-semibold", BADGE[b].className)}>
              {BADGE[b].label}
            </span>
          ))}
        </div>
        {line.breakdown && <p className="text-[11px] text-muted-foreground/80">{line.breakdown}</p>}
      </div>
    </li>
  );
}
