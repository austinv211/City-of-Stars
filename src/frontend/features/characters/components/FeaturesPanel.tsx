import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card";
import { Button } from "@/core/components/ui/button";
import { Badge } from "@/core/components/ui/badge";
import { Input } from "@/core/components/ui/input";
import { Label } from "@/core/components/ui/label";
import { Textarea } from "@/core/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/core/components/ui/dialog";
import { Plus, Trash2, ScrollText, Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { CharacterFeature } from "../types/character.types";
import { addMissingClassFeatures, addMissingSpeciesFeatures } from "../lib/classFeatures";

interface Props {
  characterId: string;
  className: string;
  species: string;
  level: number;
  canEdit: boolean;
}

const SOURCE_LABEL: Record<string, string> = {
  class: "Class", subclass: "Subclass", feat: "Feat",
  species: "Species", background: "Background", custom: "Custom",
};

const BLANK = { name: "", level_gained: 1, description: "", choice: "" };

export function FeaturesPanel({ characterId, className, species, level, canEdit }: Props) {
  const [features, setFeatures] = useState<CharacterFeature[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("character_features")
      .select("*")
      .eq("character_id", characterId)
      .order("level_gained", { ascending: true })
      .order("sort_order", { ascending: true });
    if (data) setFeatures(data as CharacterFeature[]);
  }, [characterId]);

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`character-features:${characterId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "character_features", filter: `character_id=eq.${characterId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [characterId, load]);

  async function syncFromClass() {
    setSyncing(true);
    await addMissingClassFeatures(characterId, className, level);
    await addMissingSpeciesFeatures(characterId, species);
    setSyncing(false);
    load();
  }

  async function addFeature() {
    const name = form.name.trim();
    if (!name) return;
    setSaving(true);
    await supabase.from("character_features").insert({
      character_id: characterId,
      name,
      level_gained: form.level_gained,
      source: "custom",
      description: form.description || null,
      choice: form.choice || null,
      sort_order: form.level_gained * 100 + 99,
    });
    setSaving(false);
    setOpen(false);
    setForm(BLANK);
    load();
  }

  async function removeFeature(id: string) {
    await supabase.from("character_features").delete().eq("id", id);
    load();
  }

  async function saveChoice(id: string, choice: string) {
    await supabase.from("character_features").update({ choice: choice || null }).eq("id", id);
  }

  if (!canEdit && features.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Class Features &amp; Traits
          </CardTitle>
          {canEdit && (
            <div className="flex gap-1.5">
              <Button variant="ghost" size="sm" className="h-7 text-xs" disabled={syncing} onClick={syncFromClass}>
                {syncing ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                Sync class &amp; species
              </Button>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setOpen(true)}>
                <Plus className="h-3 w-3 mr-1" /> Add
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {features.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-5 text-muted-foreground">
            <ScrollText className="h-7 w-7 opacity-40" />
            <p className="text-xs">No features yet</p>
            {canEdit && (
              <Button variant="outline" size="sm" className="h-7 text-xs" disabled={syncing} onClick={syncFromClass}>
                Pull {className} &amp; {species} features from the ruleset
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2.5">
            {features.map((f) => (
              <div key={f.id} className="rounded-md border border-border/60 px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium flex-1 min-w-0 truncate">{f.name}</span>
                  <Badge variant="outline" className="text-[10px] shrink-0">Lv {f.level_gained}</Badge>
                  {f.source !== "class" && (
                    <Badge variant="secondary" className="text-[10px] shrink-0">{SOURCE_LABEL[f.source] ?? f.source}</Badge>
                  )}
                  {canEdit && (
                    <Button
                      variant="ghost" size="icon"
                      className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeFeature(f.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                {f.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-3" title={f.description}>
                    {f.description}
                  </p>
                )}
                {canEdit ? (
                  <Input
                    defaultValue={f.choice ?? ""}
                    placeholder="choice / notes (e.g. Fighting Style: Defense)…"
                    className="h-7 text-xs mt-1.5"
                    onBlur={(e) => { if (e.target.value !== (f.choice ?? "")) saveChoice(f.id, e.target.value.trim()); }}
                  />
                ) : f.choice ? (
                  <p className="text-xs mt-1"><span className="text-muted-foreground">Choice:</span> <span className="font-medium">{f.choice}</span></p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Feature</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label>Name</Label>
                <Input value={form.name} autoFocus onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Sneak Attack" />
              </div>
              <div className="space-y-1.5">
                <Label>Level</Label>
                <Input type="number" min={1} max={20} value={form.level_gained} onChange={(e) => setForm((f) => ({ ...f, level_gained: Math.max(1, Math.min(20, parseInt(e.target.value) || 1)) }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Optional" />
            </div>
            <div className="space-y-1.5">
              <Label>Choice / notes</Label>
              <Input value={form.choice} onChange={(e) => setForm((f) => ({ ...f, choice: e.target.value }))} placeholder="Optional" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={addFeature} disabled={saving || !form.name.trim()}>{saving ? "Adding…" : "Add"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
