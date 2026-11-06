import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/core/components/ui/button";
import { RichText } from "@/core/components/RichText";
import { formatRange, type SurgeEntry } from "../lib/surgeTable";

interface Props {
  entries: SurgeEntry[];
  onEdit: (entry: SurgeEntry) => void;
  onDelete: (entry: SurgeEntry) => void;
}

/** The table as the DM sees it: range, name, and the full text on demand. */
export function SurgeTableList({ entries, onEdit, onDelete }: Props) {
  return (
    <ul className="divide-y divide-border border border-border">
      {entries.map((e) => (
        <li key={e.id} className="flex items-start gap-3 px-3 py-2">
          <span className="w-14 shrink-0 pt-0.5 font-mono text-xs text-surge">{formatRange(e.roll_min, e.roll_max)}</span>
          <div className="min-w-0 flex-1 text-sm">
            {e.description ? (
              <details>
                <summary className="cursor-pointer font-medium">{e.name}</summary>
                <RichText size="xs" className="mt-1 text-muted-foreground">{e.description}</RichText>
              </details>
            ) : (
              <p className="font-medium">{e.name}</p>
            )}
            {e.lasts_rounds !== null && (
              <p className="text-xs text-muted-foreground">Lasts {e.lasts_rounds} round{e.lasts_rounds === 1 ? "" : "s"} in combat</p>
            )}
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" aria-label={`Edit ${e.name}`} onClick={() => onEdit(e)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            aria-label={`Delete ${e.name}`}
            onClick={() => onDelete(e)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </li>
      ))}
    </ul>
  );
}
