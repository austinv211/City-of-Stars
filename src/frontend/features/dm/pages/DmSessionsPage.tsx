import { useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/core/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card";
import { Input } from "@/core/components/ui/input";
import { Textarea } from "@/core/components/ui/textarea";
import { Badge } from "@/core/components/ui/badge";
import { Separator } from "@/core/components/ui/separator";
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Lock, ScrollText, Pencil } from "lucide-react";
import { useCampaign } from "@/core/context/CampaignContext";
import { useSessionNotes } from "@/features/campaign/hooks/useSessionNotes";
import { supabase } from "@/lib/supabase";
import type { SessionNoteVisibility } from "@/features/campaign/types/campaign.types";

function InlineLabelEdit({
  label,
  onSave,
}: {
  label: string;
  onSave: (value: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(label);
  const inputRef = useRef<HTMLInputElement>(null);

  function open() {
    setDraft(label);
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  }

  function commit() {
    const trimmed = draft.trim() || "Session";
    onSave(trimmed);
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1.5">
        <Input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") setEditing(false);
          }}
          onBlur={commit}
          className="h-7 w-28 text-sm font-semibold uppercase tracking-wider text-center px-2"
          autoFocus
        />
      </div>
    );
  }

  return (
    <button
      onClick={open}
      className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors group"
    >
      {label}
      <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}

export default function DmSessionsPage() {
  const { campaign, refreshCampaign } = useCampaign();
  const { notes, saving, upsertNote } = useSessionNotes();
  const [advancing, setAdvancing] = useState(false);
  const [expandedSessions, setExpandedSessions] = useState<Set<number>>(new Set());
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [draftContent, setDraftContent] = useState("");

  if (!campaign) return null;

  const currentSession = campaign.current_session;
  const sessionLabel = campaign.session_label ?? "Session";

  const sessionNumbers = Array.from(
    new Set([currentSession, ...notes.map((n) => n.session_number)])
  ).sort((a, b) => b - a);

  async function changeSession(delta: number) {
    const next = Math.max(1, currentSession + delta);
    setAdvancing(true);
    const { error } = await supabase.rpc("set_campaign_session", {
      p_campaign_id: campaign!.id,
      p_session: next,
    });
    if (error) console.error("[DmSessionsPage] set_campaign_session:", error);
    await refreshCampaign();
    setAdvancing(false);
  }

  async function updateLabel(value: string) {
    const { error } = await supabase
      .from("campaigns")
      .update({ session_label: value })
      .eq("id", campaign!.id);
    if (error) console.error("[DmSessionsPage] updateLabel:", error);
    await refreshCampaign();
  }

  function noteKey(session: number, visibility: SessionNoteVisibility) {
    return `${session}_${visibility}`;
  }

  function getNote(session: number, visibility: SessionNoteVisibility) {
    return notes.find((n) => n.session_number === session && n.visibility === visibility);
  }

  function toggleSession(session: number) {
    setExpandedSessions((prev) => {
      const next = new Set(prev);
      if (next.has(session)) next.delete(session);
      else next.add(session);
      return next;
    });
  }

  function startEdit(session: number, visibility: SessionNoteVisibility) {
    setEditingKey(noteKey(session, visibility));
    setDraftContent(getNote(session, visibility)?.content ?? "");
  }

  async function saveEdit(session: number, visibility: SessionNoteVisibility) {
    await upsertNote(session, visibility, draftContent);
    setEditingKey(null);
  }

  return (
    <div className="px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Session Manager</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Advance the session number and write notes for your players.
        </p>
      </div>

      {/* Session counter */}
      <Card>
        <CardContent className="py-6 flex flex-col items-center gap-3">
          <InlineLabelEdit label={sessionLabel} onSave={updateLabel} />
          <div className="flex items-center gap-6">
            <Button
              variant="outline"
              size="icon"
              onClick={() => changeSession(-1)}
              disabled={advancing || currentSession <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-6xl font-bold tabular-nums w-20 text-center leading-none">
              {currentSession}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => changeSession(1)}
              disabled={advancing}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Notes per session */}
      <div className="space-y-3">
        {sessionNumbers.map((session) => {
          const isCurrent = session === currentSession;
          const isExpanded = isCurrent || expandedSessions.has(session);

          return (
            <Card key={session}>
              <CardHeader
                className="pb-3"
                onClick={() => !isCurrent && toggleSession(session)}
                style={{ cursor: isCurrent ? "default" : "pointer" }}
              >
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ScrollText className="h-4 w-4 text-muted-foreground" />
                    {sessionLabel} {session}
                    {isCurrent && <Badge variant="default" className="text-xs">Current</Badge>}
                  </CardTitle>
                  {!isCurrent && (
                    isExpanded
                      ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent className="space-y-5">
                  {/* Party Notes */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Party Notes
                      </p>
                      {editingKey !== noteKey(session, "party") && (
                        <Button variant="ghost" size="sm" onClick={() => startEdit(session, "party")}>
                          {getNote(session, "party")?.content ? "Edit" : "Add"}
                        </Button>
                      )}
                    </div>

                    {editingKey === noteKey(session, "party") ? (
                      <div className="space-y-2">
                        <Textarea
                          value={draftContent}
                          onChange={(e) => setDraftContent(e.target.value)}
                          rows={6}
                          placeholder="Markdown supported…"
                          className="font-mono text-sm"
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => saveEdit(session, "party")} disabled={saving}>
                            {saving ? "Saving…" : "Save"}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingKey(null)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : getNote(session, "party")?.content ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {getNote(session, "party")!.content!}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">No party notes yet.</p>
                    )}
                  </div>

                  <Separator />

                  {/* DM-only Notes */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          DM Notes
                        </p>
                        <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                          <Lock className="h-3 w-3" />
                          Private
                        </Badge>
                      </div>
                      {editingKey !== noteKey(session, "dm_only") && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEdit(session, "dm_only")}
                        >
                          {getNote(session, "dm_only")?.content ? "Edit" : "Add"}
                        </Button>
                      )}
                    </div>

                    {editingKey === noteKey(session, "dm_only") ? (
                      <div className="space-y-2">
                        <Textarea
                          value={draftContent}
                          onChange={(e) => setDraftContent(e.target.value)}
                          rows={6}
                          placeholder="Private DM notes… markdown supported"
                          className="font-mono text-sm"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => saveEdit(session, "dm_only")}
                            disabled={saving}
                          >
                            {saving ? "Saving…" : "Save"}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingKey(null)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : getNote(session, "dm_only")?.content ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {getNote(session, "dm_only")!.content!}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">No DM notes yet.</p>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
