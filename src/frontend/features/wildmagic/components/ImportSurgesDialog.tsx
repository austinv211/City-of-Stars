import { useMemo, useState } from "react";
import { Button } from "@/core/components/ui/button";
import { Textarea } from "@/core/components/ui/textarea";
import {
  ResponsiveDialog as Dialog,
  ResponsiveDialogContent as DialogContent,
  ResponsiveDialogHeader as DialogHeader,
  ResponsiveDialogTitle as DialogTitle,
  ResponsiveDialogDescription as DialogDescription,
  ResponsiveDialogFooter as DialogFooter,
} from "@/core/components/ui/responsive-dialog";
import { parseSurgeLines, type SurgeDraft } from "../lib/surgeTable";

interface Props {
  onClose: () => void;
  onImport: (drafts: SurgeDraft[]) => Promise<{ error?: string }>;
}

const EXAMPLE = `01-02 Roll on this table at the start of each of your turns for the next minute.
03-04 | Blue skin | Your skin turns a vibrant shade of blue until the next long rest.
05 A spectral frog appears on your shoulder and offers bad advice.`;

/** Paste a whole d100 table at once, one entry per line. */
export function ImportSurgesDialog({ onClose, onImport }: Props) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { drafts, skipped } = useMemo(() => parseSurgeLines(text), [text]);

  async function handleImport() {
    setSaving(true);
    const result = await onImport(drafts);
    setSaving(false);
    if (result.error) setError(result.error);
    else onClose();
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent widthClassName="md:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Paste a surge table</DialogTitle>
          <DialogDescription>
            One entry per line, starting with its roll or range. Use “ | ” to separate a short name from the full text.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={EXAMPLE}
          rows={12}
          aria-label="Surge table"
          className="font-mono text-xs"
        />
        <p className="text-sm text-muted-foreground">
          {drafts.length} {drafts.length === 1 ? "entry" : "entries"} ready
          {skipped.length > 0 && `; skipping line${skipped.length === 1 ? "" : "s"} ${skipped.join(", ")} (no roll found)`}.
        </p>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={saving || drafts.length === 0} onClick={() => void handleImport()}>
            {saving ? "Adding…" : `Add ${String(drafts.length)}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
