import { CalendarPlus } from "lucide-react";
import { Button } from "@/core/components/ui/button";
import { parseDay } from "@/core/lib/dates";
import type { Availability, DaySummary } from "../lib/calendar";
import type { Member } from "../hooks/useAvailability";

const longDay = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" });

const GROUPS: { status: Availability | "none"; label: string; className: string }[] = [
  { status: "yes", label: "Good", className: "text-success" },
  { status: "maybe", label: "Maybe", className: "text-secondary" },
  { status: "no", label: "Can't", className: "text-destructive" },
  { status: "none", label: "Haven't said", className: "text-muted-foreground" },
];

interface Props {
  day: string;
  summary: DaySummary | undefined;
  members: Member[];
  /** Shown to the DM: schedule the session on this day. */
  onSchedule?: () => void;
}

/** Who can make a given day, by name. */
export function DayDetails({ day, summary, members, onSchedule }: Props) {
  const answered = new Set([...(summary?.yes ?? []), ...(summary?.maybe ?? []), ...(summary?.no ?? [])]);
  const idsFor = (status: Availability | "none") =>
    status === "none" ? members.map((m) => m.user_id).filter((id) => !answered.has(id)) : (summary?.[status] ?? []);
  const nameOf = new Map(members.map((m) => [m.user_id, m.display_name]));

  return (
    <div className="space-y-3 border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">{longDay.format(parseDay(day))}</h3>
        {onSchedule && (
          <Button size="sm" onClick={onSchedule}>
            <CalendarPlus className="mr-1.5 h-3.5 w-3.5" />
            Schedule this day
          </Button>
        )}
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
        {GROUPS.map((g) => {
          const ids = idsFor(g.status);
          return (
            <div key={g.status}>
              <dt className={`text-xs font-semibold uppercase tracking-wide ${g.className}`}>
                {g.label} ({ids.length})
              </dt>
              <dd className="text-muted-foreground">{ids.map((id) => nameOf.get(id) ?? "Former member").join(", ") || "—"}</dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}
