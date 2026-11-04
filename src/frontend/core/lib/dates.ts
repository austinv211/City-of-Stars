/** Calendar-day helpers shared by the schedule and the "next session" banner. */

/** A local calendar day as YYYY-MM-DD (not toISOString, which shifts to UTC). */
export function isoDay(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${String(d.getFullYear())}-${mm}-${dd}`;
}

/** Parses YYYY-MM-DD as local midnight. */
export function parseDay(day: string): Date {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d);
}

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** "now", "in 3 hours", "tomorrow", "in 5 days", or "already started" once it is over an hour past. */
export function relativeTo(when: Date, now: Date): string {
  const diff = when.getTime() - now.getTime();
  if (Math.abs(diff) < HOUR) return "now";
  if (diff < 0) return "already started";
  if (diff < 12 * HOUR) {
    const hours = Math.round(diff / HOUR);
    return `in ${String(hours)} hour${hours === 1 ? "" : "s"}`;
  }
  const days = Math.round((parseDay(isoDay(when)).getTime() - parseDay(isoDay(now)).getTime()) / DAY);
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${String(days)} days`;
}

const dateFormat = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" });
const timeFormat = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });

/** A session's start, in the viewer's own time zone and locale. */
export function formatSessionTime(startsAt: string, now = new Date()) {
  const when = new Date(startsAt);
  return { date: dateFormat.format(when), time: timeFormat.format(when), relative: relativeTo(when, now) };
}
