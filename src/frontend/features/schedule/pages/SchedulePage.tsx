import { useMemo, useState } from "react";
import { CalendarPlus, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/core/components/ui/button";
import { Skeleton } from "@/core/components/ui/skeleton";
import { NextSessionBanner } from "@/core/components/schedule/NextSessionBanner";
import { useCampaign } from "@/core/context/CampaignContext";
import { useAuth } from "@/core/context/AuthContext";
import { useScheduledSessions, type ScheduledSession } from "@/core/hooks/useScheduledSessions";
import { formatSessionTime, isoDay } from "@/core/lib/dates";
import { AvailabilityCalendar } from "../components/AvailabilityCalendar";
import { DayDetails } from "../components/DayDetails";
import { ScheduleSessionDialog } from "../components/ScheduleSessionDialog";
import { cancelSession, saveSession, useAvailability } from "../hooks/useAvailability";
import { bestDays, calendarDays, nextStatus, summarize, type Availability } from "../lib/calendar";

const WEEKS = 6;

type Scheduling = { session: ScheduledSession | null; day: string | null } | null;

export default function SchedulePage() {
  const { campaign, isDM } = useCampaign();
  const { user } = useAuth();
  const today = isoDay(new Date());
  const days = useMemo(() => calendarDays(new Date(), WEEKS), []);
  const { marks, members, loading, setMark } = useAvailability(campaign?.id, days[0]);
  const { sessions, next } = useScheduledSessions(campaign?.id);
  const [selected, setSelected] = useState<string | null>(null);
  const [scheduling, setScheduling] = useState<Scheduling>(null);

  const summaries = useMemo(() => summarize(marks), [marks]);
  const mine = useMemo(
    () => new Map<string, Availability>(marks.filter((m) => m.user_id === user?.id).map((m) => [m.day, m.status])),
    [marks, user?.id],
  );
  const sessionDays = useMemo(() => new Set(sessions.map((s) => isoDay(new Date(s.starts_at)))), [sessions]);
  const suggestions = bestDays(summaries, today);

  if (!campaign) return <p className="px-6 py-8 text-muted-foreground">Choose a campaign to see its schedule.</p>;

  function handleTap(day: string) {
    setSelected(day);
    if (user) void setMark(user.id, day, nextStatus(mine.get(day)));
  }

  async function handleCancel(session: ScheduledSession) {
    const { error } = await cancelSession(session.id);
    if (error) toast.error(error);
    else toast.success("Session cancelled");
  }

  return (
    <div className="space-y-6 px-4 py-8 sm:px-6">
      <div>
        <h1 className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-2xl font-bold text-transparent">Schedule</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">{campaign.name}</p>
      </div>

      <div className="flex flex-wrap items-start gap-3">
        <NextSessionBanner session={next} linked={false} className="min-w-0 flex-1" />
        {isDM && (
          <div className="flex gap-2">
            {next && (
              <>
                <Button variant="outline" size="sm" onClick={() => setScheduling({ session: next, day: null })}>
                  <Pencil className="mr-1.5 h-3.5 w-3.5" />
                  Change
                </Button>
                <Button variant="ghost" size="sm" onClick={() => void handleCancel(next)}>
                  <X className="mr-1.5 h-3.5 w-3.5" />
                  Cancel
                </Button>
              </>
            )}
            <Button size="sm" onClick={() => setScheduling({ session: null, day: selected })}>
              <CalendarPlus className="mr-1.5 h-3.5 w-3.5" />
              {next ? "Add another" : "Schedule session"}
            </Button>
          </div>
        )}
      </div>

      {sessions.length > 1 && <LaterSessions sessions={sessions.slice(1)} />}

      <section aria-labelledby="availability-heading" className="space-y-3">
        <div>
          <h2 id="availability-heading" className="font-semibold">When can you play?</h2>
          <p className="text-sm text-muted-foreground">
            Tap a day to cycle: <span className="text-success">good</span> → <span className="text-secondary">maybe</span> →{" "}
            <span className="text-destructive">can&apos;t</span> → clear. Everyone in the campaign sees the totals.
          </p>
        </div>

        {suggestions.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">Best days so far:</span>
            {suggestions.map((s) => (
              <Button key={s.day} variant="outline" size="sm" className="h-7 text-xs" onClick={() => setSelected(s.day)}>
                {formatSessionTime(`${s.day}T12:00`).date} · {s.yes.length} good
              </Button>
            ))}
          </div>
        )}

        {loading ? (
          <Skeleton className="aspect-[7/6] w-full max-w-2xl" />
        ) : (
          <div className="max-w-2xl">
            <AvailabilityCalendar
              days={days}
              today={today}
              mine={mine}
              summaries={summaries}
              sessionDays={sessionDays}
              selected={selected}
              onTap={handleTap}
            />
          </div>
        )}

        {selected && (
          <DayDetails
            day={selected}
            summary={summaries.get(selected)}
            members={members}
            onSchedule={isDM ? () => setScheduling({ session: null, day: selected }) : undefined}
          />
        )}
      </section>

      {scheduling && (
        <ScheduleSessionDialog
          session={scheduling.session}
          day={scheduling.day}
          onClose={() => setScheduling(null)}
          onSave={(draft) => saveSession(campaign.id, draft, scheduling.session?.id)}
        />
      )}
    </div>
  );
}

function LaterSessions({ sessions }: { sessions: ScheduledSession[] }) {
  return (
    <div className="text-sm text-muted-foreground">
      Also scheduled:{" "}
      {sessions
        .map((s) => {
          const { date, time } = formatSessionTime(s.starts_at);
          return `${date} at ${time}`;
        })
        .join(" · ")}
    </div>
  );
}
