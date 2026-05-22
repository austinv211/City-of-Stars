import { useState, useEffect, useRef } from "react";
import { Input } from "@/core/components/ui/input";
import { Textarea } from "@/core/components/ui/textarea";
import { Button } from "@/core/components/ui/button";
import { Badge } from "@/core/components/ui/badge";
import { Label } from "@/core/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/core/components/ui/tabs";
import { Separator } from "@/core/components/ui/separator";
import { Loader2, Plus, Trash2, BookOpen, BookmarkPlus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useCampaign } from "@/core/context/CampaignContext";
import { searchMonsters, getMonster, monsterToNpc } from "@/lib/dnd5eApi";
import type { DndMonsterSummary } from "@/lib/dnd5eApi";
import type { NpcDraft } from "@/features/dm/hooks/useEncounterManager";
import type { MonsterAction, MonsterSpecialAbility } from "@/features/encounter/types/encounter.types";

export interface CustomMonster {
  id: string;
  name: string;
  hp: number;
  ac: number;
  default_initiative: number;
  str_score?: number;
  dex_score?: number;
  con_score?: number;
  int_score?: number;
  wis_score?: number;
  cha_score?: number;
  actions?: unknown;
  special_abilities?: unknown;
  description?: string | null;
}

interface Props {
  customMonsters: CustomMonster[];
  onSelect: (npc: NpcDraft) => void;
  onLibraryChange: () => void;
}

export function MonsterPicker({ customMonsters, onSelect, onLibraryChange }: Props) {
  const { campaign } = useCampaign();

  // D&D API search
  const [query, setQuery] = useState("");
  const [apiResults, setApiResults] = useState<DndMonsterSummary[]>([]);
  const [searching, setSearching] = useState(false);
  const [savingIdx, setSavingIdx] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Library filter
  const [libraryFilter, setLibraryFilter] = useState("");

  // Add custom monster form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMonster, setNewMonster] = useState({ name: "", hp: 10, ac: 12, default_initiative: 0, description: "" });
  const [addingSaving, setAddingSaving] = useState(false);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (!query.trim()) { setApiResults([]); return; }
    timer.current = setTimeout(async () => {
      setSearching(true);
      const results = await searchMonsters(query);
      setApiResults(results.slice(0, 15));
      setSearching(false);
    }, 400);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [query]);

  async function addToEncounterFromApi(summary: DndMonsterSummary) {
    const m = await getMonster(summary.index);
    if (!m) return;
    onSelect(monsterToNpc(m));
  }

  async function saveToLibrary(summary: DndMonsterSummary) {
    if (!campaign) return;
    setSavingIdx(summary.index);
    const m = await getMonster(summary.index);
    if (m) {
      const npc = monsterToNpc(m);
      await supabase.from("custom_monsters").insert({
        campaign_id: campaign.id,
        name: npc.name,
        hp: npc.hp,
        ac: npc.ac,
        default_initiative: npc.initiative,
      });
      onLibraryChange();
    }
    setSavingIdx(null);
  }

  async function deleteFromLibrary(id: string) {
    await supabase.from("custom_monsters").delete().eq("id", id);
    onLibraryChange();
  }

  async function addCustomMonster() {
    if (!campaign || !newMonster.name.trim()) return;
    setAddingSaving(true);
    await supabase.from("custom_monsters").insert({
      campaign_id: campaign.id,
      name: newMonster.name.trim(),
      hp: newMonster.hp,
      ac: newMonster.ac,
      default_initiative: newMonster.default_initiative,
      description: newMonster.description.trim() || null,
    });
    setAddingSaving(false);
    setNewMonster({ name: "", hp: 10, ac: 12, default_initiative: 0, description: "" });
    setShowAddForm(false);
    onLibraryChange();
  }

  const filteredLibrary = libraryFilter.trim()
    ? customMonsters.filter((m) =>
        m.name.toLowerCase().includes(libraryFilter.toLowerCase())
      )
    : customMonsters;

  return (
    <Tabs defaultValue="library">
      <TabsList className="w-full">
        <TabsTrigger value="library" className="flex-1">
          <BookOpen className="h-3 w-3 mr-1.5" />
          Campaign Library
          {customMonsters.length > 0 && (
            <Badge variant="secondary" className="ml-1.5 text-xs">{customMonsters.length}</Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="dnd" className="flex-1">D&amp;D 5e SRD</TabsTrigger>
      </TabsList>

      {/* ── Campaign Library Tab ─────────────────────────────────────────────── */}
      <TabsContent value="library" className="space-y-3 mt-2">
        <div className="flex items-center gap-2">
          <Input
            value={libraryFilter}
            onChange={(e) => setLibraryFilter(e.target.value)}
            placeholder="Filter monsters…"
            className="flex-1"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddForm((v) => !v)}
          >
            <Plus className="h-3 w-3 mr-1" />
            Custom
          </Button>
        </div>

        {showAddForm && (
          <div className="border rounded-lg p-3 space-y-3 bg-muted/20">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              New Custom Monster
            </p>
            <div className="space-y-1.5">
              <Label className="text-xs">Name</Label>
              <Input
                value={newMonster.name}
                onChange={(e) => setNewMonster((m) => ({ ...m, name: e.target.value }))}
                placeholder="Monster name"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">HP</Label>
                <Input
                  type="number"
                  min={1}
                  value={newMonster.hp}
                  onChange={(e) => setNewMonster((m) => ({ ...m, hp: parseInt(e.target.value) || 1 }))}
                  className="text-center"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">AC</Label>
                <Input
                  type="number"
                  min={1}
                  value={newMonster.ac}
                  onChange={(e) => setNewMonster((m) => ({ ...m, ac: parseInt(e.target.value) || 1 }))}
                  className="text-center"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Init Mod</Label>
                <Input
                  type="number"
                  value={newMonster.default_initiative}
                  onChange={(e) => setNewMonster((m) => ({ ...m, default_initiative: parseInt(e.target.value) || 0 }))}
                  className="text-center"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Description (optional)</Label>
              <Textarea
                value={newMonster.description}
                onChange={(e) => setNewMonster((m) => ({ ...m, description: e.target.value }))}
                placeholder="Flavor text shown to players…"
                rows={3}
                className="text-xs resize-none"
              />
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={addCustomMonster}
                disabled={addingSaving || !newMonster.name.trim()}
              >
                {addingSaving ? "Saving…" : "Save to Library"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        <Separator />

        {filteredLibrary.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">
            {customMonsters.length === 0
              ? "No monsters saved yet. Search D&D 5e to add monsters to your library."
              : "No matches"}
          </p>
        ) : (
          <div className="border rounded-md divide-y max-h-56 overflow-y-auto">
            {filteredLibrary.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between px-3 py-2 hover:bg-muted/50"
              >
                <div>
                  <span className="text-sm font-medium">{m.name}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    HP {m.hp} · AC {m.ac}
                    {m.default_initiative !== 0 && ` · Init ${m.default_initiative >= 0 ? "+" : ""}${m.default_initiative}`}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={() =>
                      onSelect({
                        name: m.name,
                        hp: m.hp,
                        ac: m.ac,
                        initiative: m.default_initiative,
                        str_score: m.str_score,
                        dex_score: m.dex_score,
                        con_score: m.con_score,
                        int_score: m.int_score,
                        wis_score: m.wis_score,
                        cha_score: m.cha_score,
                        actions: m.actions as MonsterAction[] | undefined,
                        special_abilities: m.special_abilities as MonsterSpecialAbility[] | undefined,
                        description: m.description ?? undefined,
                      })
                    }
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteFromLibrary(m.id)}
                    title="Remove from library"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </TabsContent>

      {/* ── D&D 5e SRD Tab ──────────────────────────────────────────────────── */}
      <TabsContent value="dnd" className="space-y-3 mt-2">
        <div className="relative">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search monsters… (e.g. goblin, young dragon, ogre)"
          />
          {searching && (
            <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>

        {apiResults.length > 0 && (
          <div className="border rounded-md divide-y max-h-56 overflow-y-auto">
            {apiResults.map((m) => {
              const isLoading = savingIdx === m.index;
              return (
                <div
                  key={m.index}
                  className="flex items-center justify-between px-3 py-2 hover:bg-muted/50"
                >
                  <span className="text-sm font-medium">{m.name}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      disabled={isLoading}
                      onClick={() => addToEncounterFromApi(m)}
                      title="Add to encounter"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      disabled={isLoading}
                      onClick={() => saveToLibrary(m)}
                      title="Save to campaign library"
                    >
                      {isLoading ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <BookmarkPlus className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {query && !searching && apiResults.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-2">No results</p>
        )}

        <p className="text-xs text-muted-foreground">
          Data from D&D 5e SRD. Use{" "}
          <BookmarkPlus className="h-3 w-3 inline" />{" "}
          to save a monster to your campaign library for quick reuse.
        </p>
      </TabsContent>
    </Tabs>
  );
}
