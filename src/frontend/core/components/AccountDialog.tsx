import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/core/components/ui/dialog";
import { Button } from "@/core/components/ui/button";
import { Input } from "@/core/components/ui/input";
import { Label } from "@/core/components/ui/label";
import { useAuth } from "@/core/context/AuthContext";
import { setFeelPrefs, useFeelPrefs } from "@/core/hooks/useFeelPrefs";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AccountDialog({ open, onOpenChange }: Props) {
  const { user, displayName, updateDisplayName } = useAuth();
  const [name, setName] = useState(displayName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset the field to the current value each time the dialog opens.
  useEffect(() => {
    if (open) {
      setName(displayName);
      setError(null);
    }
  }, [open, displayName]);

  const trimmed = name.trim();
  const dirty = trimmed !== displayName;

  async function handleSave() {
    if (!trimmed || !dirty) return;
    setSaving(true);
    setError(null);
    const { error } = await updateDisplayName(trimmed);
    setSaving(false);
    if (error) { setError(error); return; }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Account</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Display Name</Label>
            <Input
              autoFocus
              value={name}
              onChange={(e) => { setName(e.target.value); setError(null); }}
              placeholder="How others see you"
              maxLength={40}
              onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
            />
            <p className="text-xs text-muted-foreground">
              Shown in the app and on rolls you make without a character.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input value={user?.email ?? ""} disabled readOnly />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DevicePrefs />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !trimmed || !dirty}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** This device's feel: applied at once, not part of Save. */
function DevicePrefs() {
  const prefs = useFeelPrefs();
  return (
    <fieldset className="space-y-1 border-t border-border/40 pt-3">
      <legend className="text-sm font-medium">On this device</legend>
      <Toggle
        id="pref-reduce-motion"
        label="Reduce motion"
        checked={prefs.reduceMotion}
        onChange={(v) => {
          setFeelPrefs({ reduceMotion: v });
        }}
      />
      <Toggle
        id="pref-vibration"
        label="Vibrate on my turn, when I go down, and on a natural 20"
        checked={prefs.vibration}
        onChange={(v) => {
          setFeelPrefs({ vibration: v });
        }}
      />
    </fieldset>
  );
}

function Toggle({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label htmlFor={id} className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
      <input
        id={id}
        type="checkbox"
        className="h-4 w-4 accent-[var(--primary)]"
        checked={checked}
        onChange={(e) => {
          onChange(e.target.checked);
        }}
      />
      {label}
    </label>
  );
}
