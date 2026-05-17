import { useState } from "react";
import { Button } from "@/core/components/ui/button";
import { Textarea } from "@/core/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card";
import { ScrollText } from "lucide-react";

interface Props {
  value: string | null;
  isDM: boolean;
  saving: boolean;
  onSave: (text: string) => void;
}

export function SessionNotesEditor({ value, isDM, saving, onSave }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");

  function handleSave() {
    onSave(draft);
    setEditing(false);
  }

  function handleCancel() {
    setDraft(value ?? "");
    setEditing(false);
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <ScrollText className="h-4 w-4" />
            Session Notes
          </CardTitle>
          {isDM && !editing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setDraft(value ?? "");
                setEditing(true);
              }}
            >
              Edit
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {editing ? (
          <div className="space-y-3">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={8}
              placeholder="Write session notes here…"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
              <Button size="sm" variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
            </div>
          </div>
        ) : value ? (
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{value}</p>
        ) : (
          <p className="text-sm text-muted-foreground italic">
            No session notes yet.{isDM ? " Click Edit to add some." : ""}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
