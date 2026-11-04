import { useState } from "react";
import { Button } from "@/core/components/ui/button";
import { Input } from "@/core/components/ui/input";
import { Label } from "@/core/components/ui/label";
import { Textarea } from "@/core/components/ui/textarea";
import {
  ResponsiveDialog as Dialog,
  ResponsiveDialogContent as DialogContent,
  ResponsiveDialogHeader as DialogHeader,
  ResponsiveDialogTitle as DialogTitle,
  ResponsiveDialogDescription as DialogDescription,
  ResponsiveDialogFooter as DialogFooter,
} from "@/core/components/ui/responsive-dialog";
import { isoDay } from "@/core/lib/dates";
import type { ScheduledSession } from "@/core/hooks/useScheduledSessions";
import type { SessionDraft } from "../hooks/useAvailability";

interface Props {
  /** Editing this session, or scheduling a new one on `day`. */
  session: ScheduledSession | null;
  day: string | null;
  onClose: () => void;
  onSave: (draft: SessionDraft) => Promise<{ error?: string }>;
}

const DEFAULT_TIME = "19:00";
const pad = (n: number) => String(n).padStart(2, "0");

function initial(session: ScheduledSession | null, day: string | null) {
  if (!session) return { date: day ?? isoDay(new Date()), time: DEFAULT_TIME, location: "", note: "" };
  const at = new Date(session.starts_at);
  return {
    date: isoDay(at),
    time: `${pad(at.getHours())}:${pad(at.getMinutes())}`,
    location: session.location ?? "",
    note: session.note ?? "",
  };
}

/** The DM sets when the session starts; everyone sees it in their own time zone. */
export function ScheduleSessionDialog({ session, day, onClose, onSave }: Props) {
  const [fields, setFields] = useState(() => initial(session, day));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const set = (key: keyof typeof fields) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFields((f) => ({ ...f, [key]: e.target.value }));
  };

  async function handleSave() {
    // Date + time inputs are in the DM's local zone; Date turns them into an instant.
    const startsAt = new Date(`${fields.date}T${fields.time || DEFAULT_TIME}`);
    if (Number.isNaN(startsAt.getTime())) {
      setError("Pick a date and time.");
      return;
    }
    setSaving(true);
    const result = await onSave({
      starts_at: startsAt.toISOString(),
      location: fields.location.trim() || null,
      note: fields.note.trim() || null,
    });
    setSaving(false);
    if (result.error) setError(result.error);
    else onClose();
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent widthClassName="md:max-w-md">
        <DialogHeader>
          <DialogTitle>{session ? "Change the session" : "Schedule the next session"}</DialogTitle>
          <DialogDescription>Players see this in their own time zone.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="session-date">Date</Label>
              <Input id="session-date" type="date" value={fields.date} onChange={set("date")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="session-time">Start time</Label>
              <Input id="session-time" type="time" value={fields.time} onChange={set("time")} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="session-location">Where (optional)</Label>
            <Input id="session-location" maxLength={200} value={fields.location} onChange={set("location")} placeholder="Mira's place, Discord…" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="session-note">Note (optional)</Label>
            <Textarea id="session-note" maxLength={2000} rows={3} value={fields.note} onChange={set("note")} placeholder="Bring snacks. Level up to 5 before we start." />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={saving || !fields.date} onClick={() => void handleSave()}>
            {saving ? "Saving…" : session ? "Save changes" : "Schedule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
