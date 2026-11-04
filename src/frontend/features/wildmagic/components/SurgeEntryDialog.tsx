import { useState } from "react";
import { Button } from "@/core/components/ui/button";
import { Input } from "@/core/components/ui/input";
import { Label } from "@/core/components/ui/label";
import { RichTextEditor } from "@/core/components/RichTextEditor";
import {
  ResponsiveDialog as Dialog,
  ResponsiveDialogContent as DialogContent,
  ResponsiveDialogHeader as DialogHeader,
  ResponsiveDialogTitle as DialogTitle,
  ResponsiveDialogFooter as DialogFooter,
} from "@/core/components/ui/responsive-dialog";
import type { SurgeDraft, SurgeEntry } from "../lib/surgeTable";

interface Props {
  /** The entry being edited, or null for a new one. */
  entry: SurgeEntry | null;
  onClose: () => void;
  onSave: (draft: SurgeDraft) => Promise<{ error?: string }>;
}

const toNumber = (s: string) => (s.trim() === "" ? null : Number(s));
const toText = (n: number | null | undefined) => (n == null ? "" : String(n));

/** Why the draft can't be saved, or null. */
function problemWith(d: SurgeDraft): string | null {
  if (!d.name.trim()) return "Give the surge a name.";
  if ((d.roll_min === null) !== (d.roll_max === null)) return "Fill in both ends of the roll range, or neither.";
  if (d.roll_min !== null && d.roll_max !== null && d.roll_min > d.roll_max) return "The range runs backwards.";
  return null;
}

export function SurgeEntryDialog({ entry, onClose, onSave }: Props) {
  const [from, setFrom] = useState(toText(entry?.roll_min));
  const [to, setTo] = useState(toText(entry?.roll_max));
  const [name, setName] = useState(entry ? entry.name : "");
  const [description, setDescription] = useState(entry?.description ?? "");
  const [rounds, setRounds] = useState(toText(entry?.lasts_rounds));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const draft: SurgeDraft = {
      roll_min: toNumber(from),
      roll_max: toNumber(to || from),
      name: name.trim(),
      description: description.trim() || null,
      lasts_rounds: toNumber(rounds),
    };
    const problem = problemWith(draft);
    setError(problem);
    if (problem) return;
    setSaving(true);
    const result = await onSave(draft);
    setSaving(false);
    if (result.error) setError(result.error);
    else onClose();
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent widthClassName="md:max-w-xl">
        <DialogHeader>
          <DialogTitle>{entry ? "Edit surge" : "New surge"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <NumberField id="surge-from" label="Roll from" value={from} onChange={setFrom} placeholder="01" />
            <NumberField id="surge-to" label="to" value={to} onChange={setTo} placeholder={from || "02"} />
            <NumberField id="surge-rounds" label="Lasts (rounds)" value={rounds} onChange={setRounds} placeholder="Until ended" />
          </div>
          <p className="-mt-2 text-xs text-muted-foreground">
            Leave the range empty for a surge you only ever pick by hand. Rounds apply in combat.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="surge-name">Name</Label>
            <Input id="surge-name" value={name} maxLength={120} onChange={(e) => setName(e.target.value)} placeholder="Your hair turns bright blue" />
          </div>
          <div className="space-y-1.5">
            <Label>What happens</Label>
            <RichTextEditor content={description} onChange={setDescription} placeholder="Describe the effect for the player…" minHeight="7rem" />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={saving} onClick={() => void handleSave()}>{saving ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NumberField({ id, label, value, onChange, placeholder }: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        inputMode="numeric"
        min={1}
        max={100}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
