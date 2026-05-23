import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card";
import { Button } from "@/core/components/ui/button";
import { Badge } from "@/core/components/ui/badge";
import { Input } from "@/core/components/ui/input";
import { Label } from "@/core/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/core/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/core/components/ui/dialog";
import { Plus, Trash2, Sparkle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { CharacterResource } from "../types/character.types";

interface Props {
  characterId: string;
  canEdit: boolean;
}

const RECHARGE_LABEL: Record<string, string> = {
  short_rest: "Short Rest",
  long_rest: "Long Rest",
  other: "Other",
};

const BLANK = { name: "", max: 1, recharge: "long_rest" as CharacterResource["recharge"] };

export function ResourcesPanel({ characterId, canEdit }: Props) {
  const [resources, setResources] = useState<CharacterResource[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("character_resources")
      .select("*")
      .eq("character_id", characterId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (data) setResources(data as CharacterResource[]);
  }, [characterId]);

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`character-resources:${characterId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "character_resources", filter: `character_id=eq.${characterId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [characterId, load]);

  async function adjust(r: CharacterResource, delta: number) {
    if (!canEdit) return;
    const next = Math.max(0, Math.min(r.max, r.current + delta));
    if (next === r.current) return;
    setResources((prev) => prev.map((x) => (x.id === r.id ? { ...x, current: next } : x)));
    await supabase.from("character_resources").update({ current: next }).eq("id", r.id);
  }

  async function addResource() {
    const name = form.name.trim();
    if (!name) return;
    setSaving(true);
    await supabase.from("character_resources").insert({
      character_id: characterId,
      name,
      current: form.max,
      max: form.max,
      recharge: form.recharge,
      sort_order: resources.length,
    });
    setSaving(false);
    setOpen(false);
    setForm(BLANK);
    load();
  }

  async function removeResource(id: string) {
    await supabase.from("character_resources").delete().eq("id", id);
    load();
  }

  if (!canEdit && resources.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Class Resources
          </CardTitle>
          {canEdit && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setOpen(true)}>
              <Plus className="h-3 w-3 mr-1" /> Add
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {resources.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-5 text-muted-foreground">
            <Sparkle className="h-7 w-7 opacity-40" />
            <p className="text-xs">No tracked resources (e.g. Rage, Ki, Channel Divinity)</p>
          </div>
        ) : (
          <div className="space-y-2">
            {resources.map((r) => (
              <div key={r.id} className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted/40">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{r.name}</span>
                    <Badge variant="outline" className="text-[10px] shrink-0">{RECHARGE_LABEL[r.recharge] ?? r.recharge}</Badge>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    size="icon" variant="outline" className="h-6 w-6"
                    disabled={!canEdit || r.current <= 0}
                    onClick={() => adjust(r, -1)}
                  >−</Button>
                  <span className="w-12 text-center text-sm font-bold tabular-nums">
                    {r.current}<span className="text-muted-foreground font-normal">/{r.max}</span>
                  </span>
                  <Button
                    size="icon" variant="outline" className="h-6 w-6"
                    disabled={!canEdit || r.current >= r.max}
                    onClick={() => adjust(r, 1)}
                  >+</Button>
                  {canEdit && (
                    <Button
                      size="icon" variant="ghost"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      onClick={() => removeResource(r.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Resource</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                value={form.name}
                autoFocus
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Rage, Ki Points, Channel Divinity"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Max uses</Label>
                <Input
                  type="number" min={1}
                  value={form.max}
                  onChange={(e) => setForm((f) => ({ ...f, max: Math.max(1, parseInt(e.target.value) || 1) }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Recharge</Label>
                <Select value={form.recharge} onValueChange={(v) => setForm((f) => ({ ...f, recharge: v as CharacterResource["recharge"] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="short_rest">Short Rest</SelectItem>
                    <SelectItem value="long_rest">Long Rest</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={addResource} disabled={saving || !form.name.trim()}>
              {saving ? "Adding…" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
