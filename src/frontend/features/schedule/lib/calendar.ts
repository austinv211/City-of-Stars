import { isoDay } from "@/core/lib/dates";

export type Availability = "yes" | "maybe" | "no";

export interface AvailabilityMark {
  user_id: string;
  day: string; // YYYY-MM-DD, a calendar day with no time zone
  status: Availability;
}

export interface DaySummary {
  day: string;
  yes: string[];
  maybe: string[];
  no: string[];
}

/** `weeks` whole weeks of days, Monday first, starting with the week holding `from`. */
export function calendarDays(from: Date, weeks: number): string[] {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return Array.from({ length: weeks * 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return isoDay(d);
  });
}

/** Tapping a day cycles: unset → good → maybe → can't → unset. */
export function nextStatus(current: Availability | undefined): Availability | null {
  switch (current) {
    case undefined:
      return "yes";
    case "yes":
      return "maybe";
    case "maybe":
      return "no";
    case "no":
      return null;
  }
}

/** Who said what, per day. */
export function summarize(marks: AvailabilityMark[]): Map<string, DaySummary> {
  const byDay = new Map<string, DaySummary>();
  for (const m of marks) {
    const summary = byDay.get(m.day) ?? { day: m.day, yes: [], maybe: [], no: [] };
    summary[m.status].push(m.user_id);
    byDay.set(m.day, summary);
  }
  return byDay;
}

/** Higher is better: anyone who can't make it counts heavily against a day. */
export const dayScore = (s: DaySummary) => s.yes.length * 2 + s.maybe.length - s.no.length * 3;

/** The most promising upcoming days, best first; days nobody can make never qualify. */
export function bestDays(summaries: Map<string, DaySummary>, today: string, count = 3): DaySummary[] {
  return [...summaries.values()]
    .filter((s) => s.day >= today && s.yes.length > 0 && s.no.length === 0)
    .sort((a, b) => dayScore(b) - dayScore(a) || a.day.localeCompare(b.day))
    .slice(0, count);
}
