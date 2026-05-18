import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/core/components/ui/button";
import { Card, CardContent } from "@/core/components/ui/card";
import { Badge } from "@/core/components/ui/badge";
import { Input } from "@/core/components/ui/input";
import { Label } from "@/core/components/ui/label";
import { Checkbox } from "@/core/components/ui/checkbox";
import { Separator } from "@/core/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/core/components/ui/dialog";
import { Plus, Trash2, Swords, Play, Clock, BookOpen } from "lucide-react";
import { useEncounterManager } from "@/features/dm/hooks/useEncounterManager";
import { useCharacters } from "@/features/characters/hooks/useCharacters";
import { useCampaign } from "@/core/context/CampaignContext";
import { supabase } from "@/lib/supabase";
import { MonsterPicker } from "@/features/encounter/components/MonsterPicker";
import type { CustomMonster } from "@/features/encounter/components/MonsterPicker";
import type { NpcDraft, PartyEntry } from "@/features/dm/hooks/useEncounterManager";
import type { Encounter } from "@/features/encounter/types/encounter.types";

const BLANK_NPC: NpcDraft = { name: "", hp: 10, ac: 12, initiative: 0 };

function StatusBadge({ status }: { status: Encounter["status"] }) {
  if (status === "active")
    return <Badge variant="default" className="text-xs">Active</Badge>;
  if (status === "pending")
    return <Badge variant="secondary" className="text-xs">Pending</Badge>;
  return <Badge variant="outline" className="text-xs text-muted-foreground">Completed</Badge>;
}

export default function DmEncountersPage() {
  const navigate = useNavigate();
  const { campaign } = useCampaign();
  const { encounters, loading, createEncounter, startEncounter, deleteEncounter } =
    useEncounterManager();
  const { characters } = useCharacters();

  const [customMonsters, setCustomMonsters] = useState<CustomMonster[]>([]);

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [npcs, setNpcs] = useState<NpcDraft[]>([{ ...BLANK_NPC }]);
  const [creating, setCreating] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Start dialog
  const [startTarget, setStartTarget] = useState<Encounter | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [partyHp, setPartyHp] = useState<Record<string, number>>({});
  const [partyAc, setPartyAc] = useState<Record<string, number>>({});
  const [starting, setStarting] = useState(false);

  const activeCharacters = characters.filter((c) => c.status === "active");

  function loadLibrary() {
    if (!campaign) return;
    supabase
      .from("custom_monsters")
      .select("*")
      .eq("campaign_id", campaign.id)
      .order("name")
      .then(({ data }) => setCustomMonsters((data as CustomMonster[]) ?? []));
  }

  useEffect(() => {
    loadLibrary();
  }, [campaign?.id]);

  // ── Create helpers ──────────────────────────────────────────────────────────

  function openCreate() {
    setNewName("");
    setNpcs([{ ...BLANK_NPC }]);
    setCreateOpen(true);
  }

  function updateNpc(idx: number, field: keyof NpcDraft, value: string | number) {
    setNpcs((prev) => prev.map((n, i) => (i === idx ? { ...n, [field]: value } : n)));
  }

  function removeNpc(idx: number) {
    setNpcs((prev) => prev.filter((_, i) => i !== idx));
  }

  function addFromPicker(draft: NpcDraft) {
    setNpcs((prev) => {
      // Replace blank placeholder if it's the only entry
      if (prev.length === 1 && !prev[0].name.trim()) return [draft];
      return [...prev, draft];
    });
    setPickerOpen(false);
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true);
    const validNpcs = npcs.filter((n) => n.name.trim());
    await createEncounter(newName.trim(), validNpcs);
    setCreating(false);
    setCreateOpen(false);
  }

  // ── Start helpers ───────────────────────────────────────────────────────────

  function openStart(encounter: Encounter) {
    const allIds = new Set(activeCharacters.map((c) => c.id));
    const hpDefaults: Record<string, number> = {};
    const acDefaults: Record<string, number> = {};
    activeCharacters.forEach((c) => {
      hpDefaults[c.id] = 10;
      acDefaults[c.id] = 10;
    });
    setSelectedIds(allIds);
    setPartyHp(hpDefaults);
    setPartyAc(acDefaults);
    setStartTarget(encounter);
  }

  async function handleStart() {
    if (!startTarget) return;
    setStarting(true);
    const party: PartyEntry[] = activeCharacters
      .filter((c) => selectedIds.has(c.id))
      .map((c) => ({
        characterId: c.id,
        name: c.name,
        ownerId: c.owner_id,
        portraitUrl: c.portrait_url,
        hp: partyHp[c.id] ?? 10,
        ac: partyAc[c.id] ?? 10,
      }));
    await startEncounter(startTarget.id, party);
    // Advance to first turn automatically
    await supabase.rpc("advance_encounter_turn", { p_encounter_id: startTarget.id });
    setStarting(false);
    setStartTarget(null);
    navigate("/encounter");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 py-8 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Encounters</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Build encounters and launch them when the party is ready.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          New Encounter
        </Button>
      </div>

      {encounters.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
            <Swords className="h-12 w-12 text-muted-foreground opacity-30" />
            <p className="text-muted-foreground text-sm">No encounters yet.</p>
            <Button variant="outline" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Create your first encounter
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {encounters.map((enc) => (
            <Card key={enc.id}>
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Swords className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium truncate">{enc.name ?? "Unnamed Encounter"}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(enc.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge status={enc.status} />
                  {enc.status === "pending" && (
                    <>
                      <Button size="sm" onClick={() => openStart(enc)}>
                        <Play className="h-3 w-3 mr-1.5" />
                        Start
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => deleteEncounter(enc.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  {enc.status === "active" && (
                    <Button size="sm" variant="outline" onClick={() => navigate("/encounter")}>
                      <Clock className="h-3 w-3 mr-1.5" />
                      View
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Create Encounter Dialog ─────────────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Encounter</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Encounter Name</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Goblin Ambush…"
              />
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">NPCs</p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPickerOpen(true)}
                  >
                    <BookOpen className="h-3 w-3 mr-1.5" />
                    Pick Monster
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setNpcs((prev) => [...prev, { ...BLANK_NPC }])}
                  >
                    <Plus className="h-3 w-3 mr-1.5" />
                    Blank
                  </Button>
                </div>
              </div>

              {/* Column headers */}
              <div className="grid grid-cols-[1fr_70px_70px_70px_32px] gap-2 px-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Name</span>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center">HP</span>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center">AC</span>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center">Init</span>
                <span />
              </div>

              {npcs.map((npc, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_70px_70px_70px_32px] gap-2 items-center">
                  <Input
                    value={npc.name}
                    onChange={(e) => updateNpc(idx, "name", e.target.value)}
                    placeholder="Monster name"
                  />
                  <Input
                    type="number"
                    min={1}
                    value={npc.hp}
                    onChange={(e) => updateNpc(idx, "hp", parseInt(e.target.value) || 1)}
                    className="text-center"
                  />
                  <Input
                    type="number"
                    min={1}
                    value={npc.ac}
                    onChange={(e) => updateNpc(idx, "ac", parseInt(e.target.value) || 1)}
                    className="text-center"
                  />
                  <Input
                    type="number"
                    value={npc.initiative}
                    onChange={(e) => updateNpc(idx, "initiative", parseInt(e.target.value) || 0)}
                    className="text-center"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => removeNpc(idx)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Monster Picker inline panel */}
            {pickerOpen && (
              <div className="border rounded-lg p-4 bg-muted/20 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Monster Picker</p>
                  <Button variant="ghost" size="sm" onClick={() => setPickerOpen(false)}>
                    Close
                  </Button>
                </div>
                <MonsterPicker
                  customMonsters={customMonsters}
                  onSelect={addFromPicker}
                  onLibraryChange={loadLibrary}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={creating || !newName.trim()}>
              {creating ? "Creating…" : "Create Encounter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Start Encounter Dialog ─────────────────────────────────────────── */}
      <Dialog open={!!startTarget} onOpenChange={(open) => !open && setStartTarget(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Start: {startTarget?.name}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Select party members and set their starting HP and AC.
            </p>

            {activeCharacters.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No active characters in this campaign.</p>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-[auto_1fr_70px_70px] gap-2 items-center px-1">
                  <span />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Character</span>
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center">HP</span>
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center">AC</span>
                </div>
                {activeCharacters.map((c) => (
                  <div key={c.id} className="grid grid-cols-[auto_1fr_70px_70px] gap-2 items-center">
                    <Checkbox
                      checked={selectedIds.has(c.id)}
                      onCheckedChange={() => {
                        setSelectedIds((prev) => {
                          const next = new Set(prev);
                          if (next.has(c.id)) next.delete(c.id);
                          else next.add(c.id);
                          return next;
                        });
                      }}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.class} {c.level}</p>
                    </div>
                    <Input
                      type="number"
                      min={1}
                      value={partyHp[c.id] ?? 10}
                      onChange={(e) => setPartyHp((prev) => ({ ...prev, [c.id]: parseInt(e.target.value) || 1 }))}
                      disabled={!selectedIds.has(c.id)}
                      className="text-center"
                    />
                    <Input
                      type="number"
                      min={1}
                      value={partyAc[c.id] ?? 10}
                      onChange={(e) => setPartyAc((prev) => ({ ...prev, [c.id]: parseInt(e.target.value) || 1 }))}
                      disabled={!selectedIds.has(c.id)}
                      className="text-center"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setStartTarget(null)}>Cancel</Button>
            <Button onClick={handleStart} disabled={starting}>
              {starting ? "Starting…" : "Start Encounter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
