import { useState } from "react";
import { ClipboardPaste, Plus, Sparkles, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/core/components/ui/button";
import { Skeleton } from "@/core/components/ui/skeleton";
import { useCampaign } from "@/core/context/CampaignContext";
import { useSurgeTable } from "../hooks/useSurgeTable";
import { useSurgeLog } from "../hooks/useSurgeLog";
import { coverage, findOverlaps, type SurgeEntry } from "../lib/surgeTable";
import { ApplySurgePanel } from "../components/ApplySurgePanel";
import { SurgeLogList } from "../components/SurgeLogList";
import { SurgeTableList } from "../components/SurgeTableList";
import { SurgeEntryDialog } from "../components/SurgeEntryDialog";
import { ImportSurgesDialog } from "../components/ImportSurgesDialog";

type Editing = { kind: "new" } | { kind: "edit"; entry: SurgeEntry } | { kind: "import" } | null;

export default function DmWildMagicPage() {
  const { campaign } = useCampaign();
  const table = useSurgeTable(campaign?.id);
  const { log, targets } = useSurgeLog(campaign?.id);
  const [editing, setEditing] = useState<Editing>(null);

  if (!campaign) {
    return <p className="px-6 py-8 text-muted-foreground">Choose a campaign to manage its wild magic.</p>;
  }

  async function handleDelete(entry: SurgeEntry) {
    const { error } = await table.remove(entry.id);
    if (error) {
      toast.error(error);
      return;
    }
    const { roll_min, roll_max, name, description, lasts_rounds } = entry;
    toast(`Deleted “${name}”`, {
      action: { label: "Undo", onClick: () => void table.add([{ roll_min, roll_max, name, description, lasts_rounds }]) },
    });
  }

  const overlaps = findOverlaps(table.entries);
  const covered = coverage(table.entries);

  return (
    <div className="space-y-6 px-4 py-8 sm:px-6">
      <div>
        <h1 className="flex items-center gap-2 bg-gradient-to-r from-surge to-primary bg-clip-text text-2xl font-bold text-transparent">
          Wild Magic
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Your own surge table. Players see a surge the moment it lands on them, and in combat it shows on the encounter screen too.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_1fr]">
        <section aria-labelledby="apply-heading" className="space-y-6">
          <div className="wild-surge space-y-3 border border-surge/30 p-4">
            <h2 id="apply-heading" className="flex items-center gap-2 font-semibold">
              <Sparkles className="h-4 w-4 text-surge" aria-hidden />
              Trigger a surge
            </h2>
            <ApplySurgePanel targets={targets} entries={table.entries} />
          </div>
          <div className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-primary">Recent surges</h2>
            <SurgeLogList log={log} targets={targets} />
          </div>
        </section>

        <section aria-labelledby="table-heading" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 id="table-heading" className="font-semibold">Surge table</h2>
              <p className="text-xs text-muted-foreground">
                {table.entries.length} entries · covers {covered} of 100 rolls
                {covered < 100 && table.entries.length > 0 && " (other rolls pick a random entry)"}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditing({ kind: "import" })}>
                <ClipboardPaste className="mr-1.5 h-3.5 w-3.5" />
                Paste table
              </Button>
              <Button size="sm" onClick={() => setEditing({ kind: "new" })}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add surge
              </Button>
            </div>
          </div>

          {overlaps.length > 0 && (
            <p role="alert" className="flex items-start gap-2 border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              Overlapping rolls: {overlaps.map(([a, b]) => `“${a}” and “${b}”`).join("; ")}. The lower entry wins.
            </p>
          )}

          <TableBody
            loading={table.loading}
            entries={table.entries}
            onEdit={(entry) => setEditing({ kind: "edit", entry })}
            onDelete={(entry) => void handleDelete(entry)}
          />
        </section>
      </div>

      {editing?.kind === "import" && <ImportSurgesDialog onClose={() => setEditing(null)} onImport={table.add} />}
      {(editing?.kind === "new" || editing?.kind === "edit") && (
        <SurgeEntryDialog
          entry={editing.kind === "edit" ? editing.entry : null}
          onClose={() => setEditing(null)}
          onSave={(draft) => (editing.kind === "edit" ? table.update(editing.entry.id, draft) : table.add([draft]))}
        />
      )}
    </div>
  );
}

function TableBody({ loading, entries, onEdit, onDelete }: {
  loading: boolean;
  entries: SurgeEntry[];
  onEdit: (entry: SurgeEntry) => void;
  onDelete: (entry: SurgeEntry) => void;
}) {
  if (loading) return <Skeleton className="h-40 w-full" />;
  if (entries.length === 0) {
    return (
      <div className="border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
        No surges yet. Add them one at a time, or paste a whole d100 table.
      </div>
    );
  }
  return <SurgeTableList entries={entries} onEdit={onEdit} onDelete={onDelete} />;
}
