import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/core/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card";
import { Badge } from "@/core/components/ui/badge";
import { Input } from "@/core/components/ui/input";
import { Label } from "@/core/components/ui/label";
import { Checkbox } from "@/core/components/ui/checkbox";
import { Separator } from "@/core/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/core/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/core/components/ui/dialog";
import { Plus, Trash2, Swords, Play, BookOpen, ScrollText, X, Pencil, Eye } from "lucide-react";
import { Textarea } from "@/core/components/ui/textarea";
import { useEncounterManager } from "@/features/dm/hooks/useEncounterManager";
import { useCharacters } from "@/features/characters/hooks/useCharacters";
import { useCampaign } from "@/core/context/CampaignContext";
import { supabase } from "@/lib/supabase";
import NoCampaignMessage from "@/features/dm/components/NoCampaignMessage";
import { MonsterPicker } from "@/features/encounter/components/MonsterPicker";
import type { CustomMonster } from "@/features/encounter/components/MonsterPicker";
import type { NpcDraft, PartyEntry } from "@/features/dm/hooks/useEncounterManager";
import type { Encounter, EncounterParticipant } from "@/features/encounter/types/encounter.types";

interface HistoryRoll {
  id: string;
  user_id: string;
  character_name: string | null;
  rolled_by_dm: boolean;
  dice_type: string;
  result: number;
  modifier: number;
  total: number;
  roll_type: string;
  rolled_at: string;
}

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
  const {
    encounters, loading,
    createEncounter, updateTemplate, getTemplateNpcs,
    startEncounter, runTemplate, deleteEncounter,
  } = useEncounterManager();
  const { characters } = useCharacters();

  const [customMonsters, setCustomMonsters] = useState<CustomMonster[]>([]);
  // Participant counts per encounter id (for the table columns).
  const [counts, setCounts] = useState<Record<string, { npc: number; total: number }>>({});

  // Create / edit dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [npcs, setNpcs] = useState<NpcDraft[]>([{ ...BLANK_NPC }]);
  const [creating, setCreating] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Start / run dialog
  const [startTarget, setStartTarget] = useState<Encounter | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [partyHp, setPartyHp] = useState<Record<string, number>>({});
  const [partyAc, setPartyAc] = useState<Record<string, number>>({});
  const [starting, setStarting] = useState(false);

  // History side panel
  const [historyEncounter, setHistoryEncounter] = useState<Encounter | null>(null);
  const [historyRolls, setHistoryRolls] = useState<HistoryRoll[]>([]);
  const [historyParticipants, setHistoryParticipants] = useState<EncounterParticipant[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const activeCharacters = characters.filter((c) => c.status === "active");

  // ── Derived buckets ─────────────────────────────────────────────────────────
  const openEncounters = encounters.filter((e) => !e.is_template && e.status === "active");
  const templates = encounters.filter((e) => e.is_template);
  // History holds finished runs plus any leftover not-yet-started one-offs.
  const history = encounters.filter((e) => !e.is_template && e.status !== "active");

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

  // Load participant counts for every encounter shown.
  useEffect(() => {
    const ids = encounters.map((e) => e.id);
    if (ids.length === 0) {
      setCounts({});
      return;
    }
    supabase
      .from("encounter_participants")
      .select("encounter_id, is_player")
      .in("encounter_id", ids)
      .then(({ data }) => {
        const next: Record<string, { npc: number; total: number }> = {};
        ((data ?? []) as { encounter_id: string; is_player: boolean }[]).forEach((row) => {
          const c = next[row.encounter_id] ?? { npc: 0, total: 0 };
          c.total += 1;
          if (!row.is_player) c.npc += 1;
          next[row.encounter_id] = c;
        });
        setCounts(next);
      });
  }, [encounters]);

  // ── Create / edit helpers ─────────────────────────────────────────────────

  function openCreate() {
    setEditingTemplateId(null);
    setNewName("");
    setNpcs([{ ...BLANK_NPC }]);
    setPickerOpen(false);
    setCreateOpen(true);
  }

  async function openEditTemplate(template: Encounter) {
    setEditingTemplateId(template.id);
    setNewName(template.name ?? "");
    setPickerOpen(false);
    const loaded = await getTemplateNpcs(template.id);
    setNpcs(loaded.length > 0 ? loaded : [{ ...BLANK_NPC }]);
    setCreateOpen(true);
  }

  function updateNpc(idx: number, field: keyof NpcDraft, value: string | number | undefined) {
    setNpcs((prev) => prev.map((n, i) => (i === idx ? { ...n, [field]: value } : n)));
  }

  function removeNpc(idx: number) {
    setNpcs((prev) => prev.filter((_, i) => i !== idx));
  }

  function addFromPicker(draft: NpcDraft) {
    setNpcs((prev) => {
      if (prev.length === 1 && !prev[0].name.trim()) return [draft];
      return [...prev, draft];
    });
    setPickerOpen(false);
  }

  async function handleSaveTemplate() {
    if (!newName.trim()) return;
    setCreating(true);
    const validNpcs = npcs.filter((n) => n.name.trim());
    if (editingTemplateId) {
      await updateTemplate(editingTemplateId, newName.trim(), validNpcs);
    } else {
      await createEncounter(newName.trim(), validNpcs, { asTemplate: true });
    }
    setCreating(false);
    setCreateOpen(false);
  }

  // ── Start / run helpers ─────────────────────────────────────────────────────

  function openStart(encounter: Encounter) {
    const allIds = new Set(activeCharacters.map((c) => c.id));
    const hpDefaults: Record<string, number> = {};
    const acDefaults: Record<string, number> = {};
    activeCharacters.forEach((c) => {
      hpDefaults[c.id] = c.hp_current ?? c.hp_max ?? 10;
      acDefaults[c.id] = c.ac ?? 10;
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

    let runId: string | null = startTarget.id;
    if (startTarget.is_template) {
      runId = await runTemplate(startTarget, party);
    } else {
      await startEncounter(startTarget.id, party);
    }
    if (runId) {
      await supabase.rpc("advance_encounter_turn", { p_encounter_id: runId });
    }
    setStarting(false);
    setStartTarget(null);
    navigate("/dm/encounters/active");
  }

  async function openHistory(enc: Encounter) {
    setHistoryEncounter(enc);
    setHistoryLoading(true);
    const [{ data: rolls }, { data: parts }] = await Promise.all([
      supabase
        .from("dice_rolls")
        .select("*")
        .eq("encounter_id", enc.id)
        .order("rolled_at", { ascending: false }),
      supabase
        .from("encounter_participants")
        .select("*")
        .eq("encounter_id", enc.id)
        .order("initiative_order", { ascending: true }),
    ]);
    setHistoryRolls((rolls as HistoryRoll[]) ?? []);
    setHistoryParticipants((parts as EncounterParticipant[]) ?? []);
    setHistoryLoading(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const sign = (n: number) => (n >= 0 ? `+${n}` : String(n));

  if (!campaign) return <NoCampaignMessage />;

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Main column ── */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-8 space-y-8 min-w-0">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Encounters</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Build reusable encounter templates and run them whenever the party is ready.
            </p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            New Template
          </Button>
        </div>

        {/* ── Currently open encounter ── */}
        {openEncounters.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-primary flex items-center gap-2">
              <Swords className="h-3.5 w-3.5" />
              Currently Open
            </h2>
            <Card className="border-primary/40 ring-1 ring-primary/20">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead className="w-28 text-center">Combatants</TableHead>
                      <TableHead className="w-32">Started</TableHead>
                      <TableHead className="w-28 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {openEncounters.map((enc) => (
                      <TableRow key={enc.id}>
                        <TableCell className="font-medium">{enc.name ?? "Unnamed Encounter"}</TableCell>
                        <TableCell className="text-center text-muted-foreground">
                          {counts[enc.id]?.total ?? 0}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {enc.started_at ? new Date(enc.started_at).toLocaleString() : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" onClick={() => navigate("/dm/encounters/active")}>
                            <Eye className="h-3 w-3 mr-1.5" />
                            Open
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </section>
        )}

        {/* ── Templates ── */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
            <BookOpen className="h-3.5 w-3.5" />
            Encounter Templates
          </h2>
          {templates.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
                <Swords className="h-10 w-10 text-muted-foreground opacity-30" />
                <p className="text-muted-foreground text-sm">No templates yet.</p>
                <Button variant="outline" onClick={openCreate}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create your first template
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead className="w-20 text-center">NPCs</TableHead>
                      <TableHead className="w-56 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {templates.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium">{t.name ?? "Unnamed Template"}</TableCell>
                        <TableCell className="text-center text-muted-foreground">
                          {counts[t.id]?.npc ?? 0}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button size="sm" onClick={() => openStart(t)}>
                              <Play className="h-3 w-3 mr-1.5" />
                              Run
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEditTemplate(t)}
                            >
                              <Pencil className="h-3 w-3 mr-1.5" />
                              Edit
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-muted-foreground hover:text-destructive"
                              onClick={() => deleteEncounter(t.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </section>

        {/* ── History ── */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
            <ScrollText className="h-3.5 w-3.5" />
            History
          </h2>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground italic px-1">No past encounters yet.</p>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead className="w-28">Status</TableHead>
                      <TableHead className="w-24 text-center">Combatants</TableHead>
                      <TableHead className="w-40">Date</TableHead>
                      <TableHead className="w-44 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((enc) => (
                      <TableRow
                        key={enc.id}
                        className={enc.id === historyEncounter?.id ? "bg-primary/5" : undefined}
                      >
                        <TableCell className="font-medium">{enc.name ?? "Unnamed Encounter"}</TableCell>
                        <TableCell><StatusBadge status={enc.status} /></TableCell>
                        <TableCell className="text-center text-muted-foreground">
                          {counts[enc.id]?.total ?? 0}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {new Date(enc.ended_at ?? enc.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {enc.status === "completed" ? (
                              <Button size="sm" variant="outline" onClick={() => openHistory(enc)}>
                                <ScrollText className="h-3 w-3 mr-1.5" />
                                View
                              </Button>
                            ) : (
                              <Button size="sm" onClick={() => openStart(enc)}>
                                <Play className="h-3 w-3 mr-1.5" />
                                Start
                              </Button>
                            )}
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-muted-foreground hover:text-destructive"
                              onClick={() => deleteEncounter(enc.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </section>
      </div>

      {/* ── Right column — history detail panel ── */}
      {historyEncounter && (
        <div className="w-80 shrink-0 border-l overflow-y-auto p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{historyEncounter.name ?? "Encounter"}</p>
              <p className="text-xs text-muted-foreground">
                {historyEncounter.ended_at
                  ? new Date(historyEncounter.ended_at).toLocaleDateString()
                  : "Completed"}
              </p>
            </div>
            <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => setHistoryEncounter(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {historyLoading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {historyParticipants.length > 0 && (
                <>
                  <Card>
                    <CardHeader className="pb-2 pt-3 px-3">
                      <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Participants</CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 pb-3 space-y-1">
                      {historyParticipants.map((p) => (
                        <div key={p.id} className="flex items-center justify-between text-xs">
                          <span className="font-medium">{p.name}</span>
                          <span className="text-muted-foreground">{p.hp_current}/{p.hp_max} HP</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                  <Separator />
                </>
              )}

              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Roll Log
                </p>
                {historyRolls.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic py-4 text-center">No rolls recorded.</p>
                ) : (
                  historyRolls.map((r) => {
                    const displayName = r.rolled_by_dm
                      ? `DM — ${r.character_name ?? "Unknown"}`
                      : (r.character_name ?? "Unknown");
                    return (
                      <div key={r.id} className="rounded-md px-2 py-1.5 text-xs bg-muted/40 border border-transparent">
                        <div className="flex items-baseline justify-between gap-1">
                          <span className="font-medium truncate">{displayName}</span>
                          <span className="font-black shrink-0">{r.total}</span>
                        </div>
                        <div className="text-muted-foreground mt-0.5">
                          {r.roll_type} · {r.dice_type}
                          {r.modifier !== 0 && (
                            <span className="ml-1">({r.result}{sign(r.modifier)})</span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Create / Edit Template Dialog ───────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTemplateId ? "Edit Template" : "New Encounter Template"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Template Name</Label>
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
                  <Button variant="outline" size="sm" onClick={() => setPickerOpen(true)}>
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
              <div className="grid grid-cols-[1fr_70px_70px_70px_32px] gap-2 px-3">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Name</span>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center">HP</span>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center">AC</span>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center">Init</span>
                <span />
              </div>

              {npcs.map((npc, idx) => (
                <div key={idx} className="space-y-1.5 border rounded-md p-2 bg-muted/10">
                  <div className="grid grid-cols-[1fr_70px_70px_70px_32px] gap-2 items-center">
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
                  <Textarea
                    value={npc.description ?? ""}
                    onChange={(e) => updateNpc(idx, "description", e.target.value || undefined)}
                    placeholder="Description shown to players (optional)…"
                    rows={2}
                    className="text-xs resize-none"
                  />
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
            <Button onClick={handleSaveTemplate} disabled={creating || !newName.trim()}>
              {creating
                ? "Saving…"
                : editingTemplateId
                  ? "Save Template"
                  : "Create Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Start / Run Dialog ─────────────────────────────────────────────── */}
      <Dialog open={!!startTarget} onOpenChange={(open) => !open && setStartTarget(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {startTarget?.is_template ? "Run" : "Start"}: {startTarget?.name}
            </DialogTitle>
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
              {starting
                ? (startTarget?.is_template ? "Running…" : "Starting…")
                : (startTarget?.is_template ? "Run Encounter" : "Start Encounter")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
