import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Badge } from "@/core/components/ui/badge";
import { Lock } from "lucide-react";
import type { SessionNote } from "../types/campaign.types";

interface Props {
  note: SessionNote | undefined;
  label?: string;
  isDmNote?: boolean;
}

export function SessionNoteCard({ note, label, isDmNote = false }: Props) {
  return (
    <div className="space-y-2">
      {(label || isDmNote) && (
        <div className="flex items-center gap-2">
          {label && (
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {label}
            </p>
          )}
          {isDmNote && (
            <Badge variant="secondary" className="flex items-center gap-1 text-xs">
              <Lock className="h-3 w-3" />
              DM Only
            </Badge>
          )}
        </div>
      )}
      {note?.content ? (
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{note.content}</ReactMarkdown>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground italic">
          No {isDmNote ? "DM" : "party"} notes for this session.
        </p>
      )}
    </div>
  );
}
