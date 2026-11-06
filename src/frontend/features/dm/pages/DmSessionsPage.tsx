import { useState, useRef } from "react";
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Lock, ScrollText, Pencil } from "lucide-react";
import { Button } from "@/core/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card";
import { Input } from "@/core/components/ui/input";
import { Badge } from "@/core/components/ui/badge";
import { Separator } from "@/core/components/ui/separator";
import { RichTextEditor } from "@/core/components/RichTextEditor";
import { RichText } from "@/core/components/RichText";
import { useCampaign } from "@/core/context/CampaignContext";
import { useSessionNotes } from "@/features/campaign/hooks/useSessionNotes";
import { supabase } from "@/lib/supabase";
import type { SessionNoteVisibility } from "@/features/campaign/types/campaign.types";
import NoCampaignMessage from "@/features/dm/components/NoCampaignMessage";

function InlineLabelEdit({ label, onSave }: { label: string; onSave: (value: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(label);
  const inputRef = useRef<HTMLInputElement>(null);

  function open() {
    setDraft(label);
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  }

  function commit() {
    onSave(draft.trim() || "Session");
    setEditing(false);
  }

  if (editing) {
    return (
      <Input
        ref={inputRef}
        value={draft}
        aria-label="Session label"
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") setEditing(false);
        }}
        onBlur={commit}
        className="h-7 w-28 px-2 text-center text-sm font-semibold uppercase tracking-wider"
      />
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={open}
      className="group gap-1.5 text-sm font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
    >
      {label}
      <Pencil className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
    </Button>
  );
}

const NOTE_KINDS: { visibility: SessionNoteVisibility; title: string; placeholder: string; empty: string }[] = [
  { visibility: "party", title: "Party Notes", placeholder: "Write party notes… add pictures, fonts or a read-aloud box", empty: "No party notes yet." },
  { visibility: "dm_only", title: "DM Notes", placeholder: "Private DM notes…", empty: "No DM notes yet." },
];

/** One note, read or edited in place. */
function NoteBlock({ kind, content, saving, onSave }: {
  kind: (typeof NOTE_KINDS)[number];
  content: string | null | undefined;
  saving: boolean;
  onSave: (content: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const editing = draft !== null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{kind.title}</p>
          {kind.visibility === "dm_only" && (
            <Badge variant="secondary" className="flex items-center gap-1 text-xs">
              <Lock className="h-3 w-3" />
              Private
            </Badge>
          )}
        </div>
        {!editing && (
          <Button variant="ghost" size="sm" onClick={() => setDraft(content ?? "")}>
            {content ? "Edit" : "Add"}
          </Button>
        )}
      </div>

      {editing && (
        <div className="space-y-2">
          <RichTextEditor content={draft} onChange={setDraft} placeholder={kind.placeholder} minHeight="10rem" />
          <div className="flex gap-2">
            <Button size="sm" disabled={saving} onClick={() => void onSave(draft).then(() => setDraft(null))}>
              {saving ? "Saving…" : "Save"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setDraft(null)}>Cancel</Button>
          </div>
        </div>
      )}
      {!editing && (content ? <RichText size="base">{content}</RichText> : <p className="text-sm italic text-muted-foreground">{kind.empty}</p>)}
    </div>
  );
}

export default function DmSessionsPage() {
  const { campaign, refreshCampaign } = useCampaign();
  const { notes, saving, upsertNote } = useSessionNotes();
  const [advancing, setAdvancing] = useState(false);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  if (!campaign) return <NoCampaignMessage />;

  const campaignId = campaign.id;
  const currentSession = campaign.current_session;
  const sessionLabel = campaign.session_label;
  const sessionNumbers = [...new Set([currentSession, ...notes.map((n) => n.session_number)])].sort((a, b) => b - a);

  const noteFor = (session: number, visibility: SessionNoteVisibility) =>
    notes.find((n) => n.session_number === session && n.visibility === visibility)?.content;

  async function changeSession(delta: number) {
    setAdvancing(true);
    const { error } = await supabase.rpc("set_campaign_session", {
      p_campaign_id: campaignId,
      p_session: Math.max(1, currentSession + delta),
    });
    if (error) console.error("[DmSessionsPage] set_campaign_session:", error);
    await refreshCampaign();
    setAdvancing(false);
  }

  async function updateLabel(value: string) {
    const { error } = await supabase.from("campaigns").update({ session_label: value }).eq("id", campaignId);
    if (error) console.error("[DmSessionsPage] updateLabel:", error);
    await refreshCampaign();
  }

  function toggle(session: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (!next.delete(session)) next.add(session);
      return next;
    });
  }

  return (
    <div className="space-y-6 px-4 py-8 sm:px-6">
      <div>
        <h1 className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-2xl font-bold text-transparent">Session Manager</h1>
        <p className="mt-1 text-sm text-muted-foreground">Advance the session number and write notes for your players.</p>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-6">
          <InlineLabelEdit label={sessionLabel} onSave={(v) => void updateLabel(v)} />
          <div className="flex items-center gap-6">
            <Button variant="outline" size="icon" onClick={() => void changeSession(-1)} disabled={advancing || currentSession <= 1} aria-label="Previous session">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="w-20 text-center text-6xl font-bold leading-none tabular-nums">{currentSession}</span>
            <Button variant="outline" size="icon" onClick={() => void changeSession(1)} disabled={advancing} aria-label="Next session">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Separator />

      <div className="space-y-3">
        {sessionNumbers.map((session) => {
          const isCurrent = session === currentSession;
          const isExpanded = isCurrent || expanded.has(session);
          const Chevron = isExpanded ? ChevronUp : ChevronDown;
          return (
            <Card key={session}>
              <CardHeader className="pb-3">
                <button
                  type="button"
                  disabled={isCurrent}
                  onClick={() => toggle(session)}
                  aria-expanded={isExpanded}
                  className="flex w-full items-center justify-between text-left disabled:cursor-default"
                >
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ScrollText className="h-4 w-4 text-muted-foreground" />
                    {sessionLabel} {session}
                    {isCurrent && <Badge variant="default" className="text-xs">Current</Badge>}
                  </CardTitle>
                  {!isCurrent && <Chevron className="h-4 w-4 text-muted-foreground" />}
                </button>
              </CardHeader>

              {isExpanded && (
                <CardContent className="space-y-5">
                  {NOTE_KINDS.map((kind, i) => (
                    <div key={kind.visibility} className="space-y-5">
                      {i > 0 && <Separator />}
                      <NoteBlock
                        kind={kind}
                        content={noteFor(session, kind.visibility)}
                        saving={saving}
                        onSave={(content) => upsertNote(session, kind.visibility, content)}
                      />
                    </div>
                  ))}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
