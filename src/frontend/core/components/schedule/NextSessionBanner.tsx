import { Link } from "react-router";
import { CalendarClock, MapPin } from "lucide-react";
import { formatSessionTime } from "@/core/lib/dates";
import { cn } from "@/lib/utils";
import type { ScheduledSession } from "@/core/hooks/useScheduledSessions";

interface Props {
  session: ScheduledSession | null;
  /** Links to the schedule page; off on the schedule page itself. */
  linked?: boolean;
  className?: string;
}

/** "Next session: Saturday, November 8 at 7:00 PM · in 4 days". */
export function NextSessionBanner({ session, linked = true, className }: Props) {
  if (!session) {
    return linked ? (
      <Link to="/schedule" className={cn("block border border-dashed border-border px-4 py-3 text-sm text-muted-foreground hover:border-primary/50", className)}>
        No session scheduled yet. Mark the days you can play →
      </Link>
    ) : null;
  }

  const { date, time, relative } = formatSessionTime(session.starts_at);
  const body = (
    <div className="flex items-start gap-3">
      <CalendarClock className="mt-0.5 h-5 w-5 shrink-0 text-secondary" aria-hidden />
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-secondary">Next session · {relative}</p>
        <p className="font-semibold">
          {date} at {time}
        </p>
        {session.location && (
          <p className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" aria-hidden />
            {session.location}
          </p>
        )}
        {session.note && <p className="mt-1 text-sm text-muted-foreground">{session.note}</p>}
      </div>
    </div>
  );

  const frame = cn("block border border-secondary/30 bg-secondary/5 px-4 py-3", className);
  return linked ? (
    <Link to="/schedule" className={cn(frame, "hover:border-secondary/60")}>
      {body}
    </Link>
  ) : (
    <div className={frame}>{body}</div>
  );
}
