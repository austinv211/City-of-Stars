import { useState } from "react";
import { Badge } from "@/core/components/ui/badge";
import { Button } from "@/core/components/ui/button";
import { Users, Pencil, Check, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { RichTextEditor } from "@/core/components/RichTextEditor";
import type { Campaign } from "../types/campaign.types";

interface Props {
  campaign: Campaign;
  isDM: boolean;
  memberCount: number;
  onEditDescription?: (description: string) => Promise<void>;
}

export function CampaignHeader({ campaign, isDM, memberCount, onEditDescription }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(campaign.description ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!onEditDescription) return;
    setSaving(true);
    await onEditDescription(draft);
    setSaving(false);
    setEditing(false);
  }

  function handleCancel() {
    setDraft(campaign.description ?? "");
    setEditing(false);
  }

  return (
    <div className="space-y-1 min-w-0">
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">{campaign.name}</h1>
        {isDM && <Badge>DM</Badge>}
      </div>

      {editing ? (
        <div className="space-y-2 mt-2">
          <RichTextEditor
            content={draft}
            onChange={setDraft}
            placeholder="A brief description of the campaign…"
            minHeight="5rem"
          />
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleSave} disabled={saving}>
              <Check className="h-3.5 w-3.5 mr-1" />
              {saving ? "Saving…" : "Save"}
            </Button>
            <Button size="sm" variant="ghost" onClick={handleCancel} disabled={saving}>
              <X className="h-3.5 w-3.5 mr-1" />
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-2 group">
          <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground min-w-0">
            {campaign.description
              ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{campaign.description}</ReactMarkdown>
              : onEditDescription && <p className="italic text-muted-foreground/60 text-sm">No description yet.</p>
            }
          </div>
          {onEditDescription && (
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5"
              onClick={() => { setDraft(campaign.description ?? ""); setEditing(true); }}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      )}

      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Users className="h-4 w-4" />
        <span>{memberCount} member{memberCount !== 1 ? "s" : ""}</span>
      </div>
    </div>
  );
}
