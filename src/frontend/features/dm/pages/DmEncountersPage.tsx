import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/core/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card";
import { Badge } from "@/core/components/ui/badge";
import { Separator } from "@/core/components/ui/separator";
import { ResponsiveTable } from "@/core/components/ui/responsive-table";
import { Plus, Trash2, Swords, Play, BookOpen, ScrollText, X, Pencil, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEncounterManager } from "@/features/dm/hooks/useEncounterManager";
import { useCharacters } from "@/features/characters/hooks/useCharacters";
import { useCampaign } from "@/core/context/CampaignContext";
import { supabase } from "@/lib/supabase";
import NoCampaignMessage from "@/features/dm/components/NoCampaignMessage";
import { StartEncounterDialog } from "@/features/dm/components/StartEncounterDialog";
import { TemplateDialog } from "@/features/dm/components/TemplateDialog";
import { BLANK_NPC, type TemplateDraft } from "@/features/dm/lib/templateDraft";
import type { CustomMonster } from "@/features/encounter/components/MonsterPicker";
import type { PartyEntry } from "@/features/dm/hooks/useEncounterManager";
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

  // Create / edit dialog: the template being edited, or null when closed.
  const [templateDraft, setTemplateDraft] = useState<TemplateDraft | null>(null);

  // Start / run dialog
  const [startTarget, setStartTarget] = useState<Encounter | null>(null);

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
    setTemplateDraft({ id: null, name: "", npcs: [{ ...BLANK_NPC }] });
  }

  async function openEditTemplate(template: Encounter) {
    const loaded = await getTemplateNpcs(template.id);
    setTemplateDraft({
      id: template.id,
      name: template.name ?? "",
      npcs: loaded.length > 0 ? loaded : [{ ...BLANK_NPC }],
    });
  }

  async function handleSaveTemplate(draft: TemplateDraft) {
    if (draft.id) await updateTemplate(draft.id, draft.name, draft.npcs);
    else await createEncounter(draft.name, draft.npcs, { asTemplate: true });
    setTemplateDraft(null);
  }

  // ── Start / run helpers ─────────────────────────────────────────────────────

  async function handleStart(encounter: Encounter, party: PartyEntry[]) {
    const runId = encounter.is_template
      ? await runTemplate(encounter, party)
      : (await startEncounter(encounter.id, party), encounter.id);
    if (runId) {
      await supabase.rpc("advance_encounter_turn", { p_encounter_id: runId });
    }
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
        // Rolls only: announced actions are stored too, with no dice.
        .neq("dice_type", "")
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
      <div
        className={cn(
          "min-w-0 flex-1 space-y-8 overflow-y-auto px-4 py-8 sm:px-6",
          // On a narrow screen the detail panel replaces the list rather
          // than squeezing it; the panel's close button restores this view.
          historyEncounter && "hidden lg:block",
        )}
      >
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
                <ResponsiveTable
                  className="border-0"
                  data={openEncounters}
                  getRowKey={(enc) => enc.id}
                  columns={[
                    {
                      key: "name",
                      header: "Name",
                      primary: true,
                      cell: (enc) => enc.name ?? "Unnamed Encounter",
                    },
                    {
                      key: "combatants",
                      header: "Combatants",
                      headClassName: "w-28 text-center",
                      cellClassName: "text-muted-foreground md:text-center",
                      cell: (enc) => counts[enc.id]?.total ?? 0,
                    },
                    {
                      key: "started",
                      header: "Started",
                      headClassName: "w-32",
                      cellClassName: "text-xs text-muted-foreground",
                      cell: (enc) =>
                        enc.started_at ? new Date(enc.started_at).toLocaleString() : "—",
                    },
                    {
                      key: "actions",
                      header: "Actions",
                      actions: true,
                      headClassName: "w-28 text-right",
                      cellClassName: "md:text-right",
                      cell: () => (
                        <Button
                          size="sm"
                          onClick={() => {
                            navigate("/dm/encounters/active");
                          }}
                        >
                          <Eye className="mr-1.5 h-3 w-3" />
                          Open
                        </Button>
                      ),
                    },
                  ]}
                />
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
                <ResponsiveTable
                  className="border-0"
                  data={templates}
                  getRowKey={(tpl) => tpl.id}
                  columns={[
                    {
                      key: "name",
                      header: "Name",
                      primary: true,
                      cell: (tpl) => tpl.name ?? "Unnamed Template",
                    },
                    {
                      key: "npcs",
                      header: "NPCs",
                      headClassName: "w-20 text-center",
                      cellClassName: "text-muted-foreground md:text-center",
                      cell: (tpl) => counts[tpl.id]?.npc ?? 0,
                    },
                    {
                      key: "actions",
                      header: "Actions",
                      actions: true,
                      headClassName: "w-56 text-right",
                      cell: (tpl) => (
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            onClick={() => {
                              setStartTarget(tpl);
                            }}
                          >
                            <Play className="mr-1.5 h-3 w-3" />
                            Run
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              openEditTemplate(tpl);
                            }}
                          >
                            <Pencil className="mr-1.5 h-3 w-3" />
                            Edit
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() => {
                              void deleteEncounter(tpl.id);
                            }}
                            aria-label={`Delete ${tpl.name ?? "template"}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ),
                    },
                  ]}
                />
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
                <ResponsiveTable
                  className="border-0"
                  data={history}
                  getRowKey={(enc) => enc.id}
                  rowClassName={(enc) =>
                    enc.id === historyEncounter?.id ? "bg-primary/5" : undefined
                  }
                  columns={[
                    {
                      key: "name",
                      header: "Name",
                      primary: true,
                      cell: (enc) => enc.name ?? "Unnamed Encounter",
                    },
                    {
                      key: "status",
                      header: "Status",
                      headClassName: "w-28",
                      cell: (enc) => <StatusBadge status={enc.status} />,
                    },
                    {
                      key: "combatants",
                      header: "Combatants",
                      headClassName: "w-24 text-center",
                      cellClassName: "text-muted-foreground md:text-center",
                      cell: (enc) => counts[enc.id]?.total ?? 0,
                    },
                    {
                      key: "date",
                      header: "Date",
                      headClassName: "w-40",
                      cellClassName: "text-xs text-muted-foreground",
                      cell: (enc) =>
                        new Date(enc.ended_at ?? enc.created_at).toLocaleDateString(),
                    },
                    {
                      key: "actions",
                      header: "Actions",
                      actions: true,
                      headClassName: "w-44 text-right",
                      cell: (enc) => (
                        <div className="flex items-center justify-end gap-1.5">
                          {enc.status === "completed" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                void openHistory(enc);
                              }}
                            >
                              <ScrollText className="mr-1.5 h-3 w-3" />
                              View
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => {
                                setStartTarget(enc);
                              }}
                            >
                              <Play className="mr-1.5 h-3 w-3" />
                              Start
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() => {
                              void deleteEncounter(enc.id);
                            }}
                            aria-label={`Delete ${enc.name ?? "encounter"}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ),
                    },
                  ]}
                />
              </CardContent>
            </Card>
          )}
        </section>
      </div>

      {/* ── Right column — history detail panel ── */}
      {historyEncounter && (
        <div className="w-full shrink-0 space-y-4 overflow-y-auto p-4 lg:w-80 lg:border-l">
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
      <TemplateDialog
        key={templateDraft ? (templateDraft.id ?? "new") : "closed"}
        draft={templateDraft}
        customMonsters={customMonsters}
        onLibraryChange={loadLibrary}
        onClose={() => {
          setTemplateDraft(null);
        }}
        onSave={handleSaveTemplate}
      />

      {/* ── Start / Run Dialog ─────────────────────────────────────────────── */}
      <StartEncounterDialog
        key={startTarget?.id ?? "closed"}
        encounter={startTarget}
        characters={activeCharacters}
        onClose={() => {
          setStartTarget(null);
        }}
        onStart={(party) => (startTarget ? handleStart(startTarget, party) : Promise.resolve())}
      />
    </div>
  );
}
