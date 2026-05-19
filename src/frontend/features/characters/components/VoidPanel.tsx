import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/core/components/ui/button";
import { RichTextEditor } from "@/core/components/RichTextEditor";
import { Badge } from "@/core/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card";
import { Separator } from "@/core/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/core/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/core/context/AuthContext";
import { logAudit } from "../lib/auditLog";
import type { Character } from "../types/character.types";

interface VoidAbility {
  name: string;
  cost: number;
  desc: string;
}

const VOID_ABILITIES: VoidAbility[] = [
  { name: "Director's Cut",               cost: 3, desc: "Cut up to a 30-minute scene from the story." },
  { name: "Special Effects — Fireball",   cost: 1, desc: "Summon a pyrotechnic effect (max-level fireball)." },
  { name: "Special Effects — Slow-Mo",    cost: 1, desc: "Slow time to avoid an incoming projectile." },
  { name: "Prop Placement",               cost: 1, desc: "Add a prop to the scene or replace an item." },
  { name: "Automated Dialogue Replacement", cost: 1, desc: "Dub over another being's speech." },
  { name: "Skill Montage",                cost: 1, desc: "Gain +5 to a single skill check." },
  { name: "Jump-Cut",                     cost: 2, desc: "Teleport to another location via a jump-cut." },
  { name: "Guest Star",                   cost: 2, desc: "Summon a character from a movie as a helpful companion." },
  { name: "That's a Wrap",                cost: 3, desc: "Call the end of a Void encounter (party must all be above level 2 will); all players add 3 points." },
  { name: "Script Writer",                cost: 1, desc: "Correct a previous bit of your dialogue with new dialogue." },
];

interface Props {
  character: Character;
  isOwn: boolean;
  isDM?: boolean;
  onRefresh: () => void;
}

export function VoidPanel({ character, isOwn, isDM, onRefresh }: Props) {
  const { user } = useAuth();
  const [level, setLevel] = useState(character.will_of_void);
  const [notes, setNotes] = useState(character.will_of_void_notes ?? "");
  const [editingNotes, setEditingNotes] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmAbility, setConfirmAbility] = useState<VoidAbility | null>(null);

  async function saveLevel(newLevel: number) {
    const clamped = Math.max(0, Math.min(5, newLevel));
    const oldLevel = level;
    setLevel(clamped);
    await supabase.from("characters").update({ will_of_void: clamped }).eq("id", character.id);
    if (user) await logAudit(character.id, user.id, "will_of_void", String(oldLevel), String(clamped));
    onRefresh();
  }

  async function saveNotes() {
    setSaving(true);
    const newVal = notes || null;
    const oldVal = character.will_of_void_notes ?? null;
    await supabase
      .from("characters")
      .update({ will_of_void_notes: newVal })
      .eq("id", character.id);
    if (user) await logAudit(character.id, user.id, "will_of_void_notes", oldVal, newVal);
    setSaving(false);
    setEditingNotes(false);
    onRefresh();
  }

  async function useAbility(ability: VoidAbility) {
    setConfirmAbility(null);
    const newLevel = Math.min(5, level + ability.cost);
    await saveLevel(newLevel);
  }

  const canEdit = isOwn || isDM;

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Will of the Void
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Gauge */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold">
                Level: <span className="text-primary">{level}</span> / 5
              </p>
              {isDM && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 text-xs"
                  onClick={() => saveLevel(0)}
                >
                  Reset
                </Button>
              )}
            </div>
            <div className="flex gap-1 flex-wrap">
              {Array.from({ length: 6 }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => canEdit && saveLevel(i)}
                  title={`Set to ${i}`}
                  className={`w-7 h-7 rounded text-xs font-bold transition-colors border ${
                    i <= level
                      ? "bg-primary border-primary text-primary-foreground"
                      : "bg-transparent border-muted-foreground/30 text-muted-foreground hover:border-primary"
                  } ${!canEdit ? "cursor-default" : "cursor-pointer"}`}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Abilities */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Void Abilities
            </p>
            <div className="space-y-2">
              {VOID_ABILITIES.map((ability) => (
                <div
                  key={ability.name}
                  className="flex items-start gap-2 rounded-md px-2 py-1.5 hover:bg-muted/40"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-medium">{ability.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {ability.cost} pt{ability.cost !== 1 ? "s" : ""}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{ability.desc}</p>
                  </div>
                  {isOwn && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-xs shrink-0"
                      disabled={level >= 5}
                      onClick={() =>
                        ability.cost >= 2
                          ? setConfirmAbility(ability)
                          : useAbility(ability)
                      }
                    >
                      Use
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Notes */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-medium text-muted-foreground">Active Modifications & Notes</p>
              {canEdit && !editingNotes && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() => setEditingNotes(true)}
                >
                  Edit
                </Button>
              )}
            </div>
            {editingNotes ? (
              <div className="space-y-2">
                <RichTextEditor
                  content={notes}
                  onChange={setNotes}
                  placeholder="Record active reality edits, script overrides…"
                  minHeight="6rem"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={saveNotes} disabled={saving}>
                    {saving ? "Saving…" : "Save"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setNotes(character.will_of_void_notes ?? ""); setEditingNotes(false); }}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : notes ? (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{notes}</ReactMarkdown>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">No active modifications.</p>
            )}
          </div>

        </CardContent>
      </Card>

      {/* Confirm dialog for multi-point abilities */}
      <Dialog open={!!confirmAbility} onOpenChange={(o) => !o && setConfirmAbility(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Use {confirmAbility?.name}?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will add <strong>{confirmAbility?.cost} point{(confirmAbility?.cost ?? 1) !== 1 ? "s" : ""}</strong> to Will of the Void
            (current: {level}, new: {Math.min(5, level + (confirmAbility?.cost ?? 0))}).
          </p>
          <p className="text-sm">{confirmAbility?.desc}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmAbility(null)}>Cancel</Button>
            <Button onClick={() => confirmAbility && useAbility(confirmAbility)}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
