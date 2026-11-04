import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/core/components/ui/dialog";
import { Button } from "@/core/components/ui/button";
import { Input } from "@/core/components/ui/input";
import { Label } from "@/core/components/ui/label";
import { useAuth } from "@/core/context/AuthContext";

export const DISPLAY_NAME_MAX = 40;

/**
 * Asks once for a display name, for accounts made before sign-up asked for
 * one. The DM finds people by this name, so it is worth asking up front;
 * "Not now" only hides it until the app next starts.
 */
export function DisplayNamePrompt() {
  const { user, hasDisplayName, displayName, updateDisplayName } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user || hasDisplayName || dismissed) return null;

  const trimmed = name.trim();

  async function save() {
    if (!trimmed) return;
    setSaving(true);
    const result = await updateDisplayName(trimmed);
    setSaving(false);
    if (result.error) setError(result.error);
  }

  return (
    <Dialog open onOpenChange={(open) => !open && setDismissed(true)}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>What should the table call you?</DialogTitle>
          <DialogDescription>
            Your display name is how your DM finds you and how others see you. Your email stays private.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <Label htmlFor="display-name-prompt">Display name</Label>
          <Input
            id="display-name-prompt"
            value={name}
            maxLength={DISPLAY_NAME_MAX}
            placeholder={displayName}
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </form>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setDismissed(true)}>Not now</Button>
          <Button disabled={!trimmed || saving} onClick={() => void save()}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
