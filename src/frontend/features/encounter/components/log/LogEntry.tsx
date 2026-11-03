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
import { QuickLink } from "../quickview/QuickLink";

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
 * One log line: "Grizzle → Isolde", then the ability, the total, and for the
 * DM the verdict against the target's AC. Names and abilities open the quick
 * view: who someone is and what they've done, or what an ability does.
 */
export function LogEntry({ entry, line }: { entry: RollEntry; line: LogLine }) {
  const Icon = KIND_ICON[entry.kind === "action" ? "action" : (entry.context?.kind ?? "other")];
  const ctx = entry.context;
  const source = ctx?.source;
  const actorId = ctx?.actorId ?? null;
  const targetId = ctx?.targetId ?? null;

  return (
    <li className={cn("flex gap-2 px-3 py-2 text-xs", rowTint(line))}>
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex items-baseline gap-1.5">
          <People line={line} actorId={actorId} targetId={targetId} />
          {line.total !== null && (
            <span className="ml-auto shrink-0 text-base font-black">{line.total}</span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-muted-foreground">
          <QuickLink
            subject={source ? { kind: "ability", source, actorId } : null}
            className="font-semibold text-foreground"
          >
            {line.title}
          </QuickLink>
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

/** "Grizzle → Isolde", each name opening that combatant's quick view. */
function People({
  line,
  actorId,
  targetId,
}: {
  line: LogLine;
  actorId: string | null;
  targetId: string | null;
}) {
  const person = (id: string | null) => (id ? ({ kind: "combatant", id } as const) : null);
  return (
    <span className="flex min-w-0 items-baseline font-medium">
      <QuickLink subject={person(actorId)}>{line.actor}</QuickLink>
      {line.target && (
        <>
          {/* Real spaces, so the line reads "Grizzle → Isolde" when copied or read aloud. */}
          <span className="shrink-0 whitespace-pre text-muted-foreground"> → </span>
          <QuickLink subject={person(targetId)} className="text-muted-foreground">
            {line.target}
          </QuickLink>
        </>
      )}
    </span>
  );
}
