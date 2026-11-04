import { Star } from "lucide-react";
import { parseDay } from "@/core/lib/dates";
import { cn } from "@/lib/utils";
import type { Availability, DaySummary } from "../lib/calendar";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const MINE_STYLE: Record<Availability, string> = {
  yes: "border-success/70 bg-success/20",
  maybe: "border-secondary/70 bg-secondary/15",
  no: "border-destructive/60 bg-destructive/10",
};

const MINE_LABEL: Record<Availability, string> = { yes: "good for you", maybe: "maybe for you", no: "you can't" };

const longDay = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" });
const monthShort = new Intl.DateTimeFormat(undefined, { month: "short" });

interface Props {
  days: string[];
  today: string;
  mine: Map<string, Availability>;
  summaries: Map<string, DaySummary>;
  sessionDays: Set<string>;
  selected: string | null;
  onTap: (day: string) => void;
}

function cellLabel(day: string, mine: Availability | undefined, s: DaySummary | undefined, hasSession: boolean) {
  const parts = [longDay.format(parseDay(day))];
  if (hasSession) parts.push("session scheduled");
  parts.push(mine ? MINE_LABEL[mine] : "not marked by you");
  if (s) parts.push(`${String(s.yes.length)} good, ${String(s.maybe.length)} maybe, ${String(s.no.length)} can't`);
  return parts.join(". ");
}

/** Six weeks of days; tap one to cycle your own answer for it. */
export function AvailabilityCalendar({ days, today, mine, summaries, sessionDays, selected, onTap }: Props) {
  return (
    <div>
      <div className="grid grid-cols-7 gap-1 pb-1 text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {WEEKDAYS.map((d) => <span key={d}>{d}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, i) => {
          const date = parseDay(day);
          const past = day < today;
          const status = mine.get(day);
          const summary = summaries.get(day);
          const showMonth = i === 0 || date.getDate() === 1;
          return (
            <button
              key={day}
              type="button"
              disabled={past}
              aria-label={cellLabel(day, status, summary, sessionDays.has(day))}
              onClick={() => onTap(day)}
              className={cn(
                "relative flex aspect-square min-h-11 flex-col items-start justify-between border p-1 text-left transition-colors sm:p-1.5",
                "border-border hover:border-primary/60 disabled:pointer-events-none disabled:opacity-35",
                status && MINE_STYLE[status],
                day === today && "ring-1 ring-primary",
                selected === day && "outline outline-2 outline-primary",
              )}
            >
              <span className="text-xs font-medium leading-none sm:text-sm">
                {showMonth && <span className="mr-0.5 text-[10px] uppercase text-muted-foreground">{monthShort.format(date)}</span>}
                {date.getDate()}
              </span>
              {sessionDays.has(day) && <Star className="absolute right-1 top-1 h-3 w-3 fill-secondary text-secondary" aria-hidden />}
              {summary && <Tally summary={summary} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** The group's answers as tiny counts: green good, red can't. */
function Tally({ summary }: { summary: DaySummary }) {
  return (
    <span className="flex gap-1 text-[10px] font-semibold leading-none" aria-hidden>
      {summary.yes.length > 0 && <span className="text-success">{summary.yes.length}✓</span>}
      {summary.maybe.length > 0 && <span className="text-secondary">{summary.maybe.length}?</span>}
      {summary.no.length > 0 && <span className="text-destructive">{summary.no.length}✗</span>}
    </span>
  );
}
