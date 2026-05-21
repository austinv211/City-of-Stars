import { useState, useEffect, useRef } from "react";
import { Button } from "@/core/components/ui/button";
import { Input } from "@/core/components/ui/input";
import { Label } from "@/core/components/ui/label";
import { Textarea } from "@/core/components/ui/textarea";
import { Badge } from "@/core/components/ui/badge";
import { Card, CardContent } from "@/core/components/ui/card";
import { Separator } from "@/core/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/core/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/core/components/ui/select";
import { Plus, Trash2, Loader2, Search, Camera, Skull } from "lucide-react";
import { Skeleton } from "@/core/components/ui/skeleton";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/core/context/AuthContext";
import { useCampaign } from "@/core/context/CampaignContext";
import NoCampaignMessage from "@/features/dm/components/NoCampaignMessage";
import { searchMonsters, getMonster, monsterToDbForm } from "@/lib/dnd5eApi";
import type { DndMonsterSummary } from "@/lib/dnd5eApi";
import type { MonsterAction, MonsterSpecialAbility } from "@/features/encounter/types/encounter.types";

const SIZES = ["Tiny", "Small", "Medium", "Large", "Huge", "Gargantuan"];
const TYPES = [
  "aberration", "beast", "celestial", "construct", "dragon", "elemental",
  "fey", "fiend", "giant", "humanoid", "monstrosity", "ooze", "plant", "undead",
];

interface LegendaryAction {
  name: string;
  desc: string;
}

interface MonsterForm {
  name: string;
  size: string;
  type: string;
  alignment: string;
  hp: number;
  ac: number;
  speed: number;
  cr: string;
  xp: number;
  str_score: number;
  dex_score: number;
  con_score: number;
  int_score: number;
  wis_score: number;
  cha_score: number;
  special_abilities: MonsterSpecialAbility[];
  actions: MonsterAction[];
  legendary_actions: LegendaryAction[];
  damage_resistances: string;
  damage_immunities: string;
  condition_immunities: string;
  senses: string;
  languages: string;
}

interface MonsterRecord extends MonsterForm {
  id: string;
  portrait_url: string | null;
  default_initiative: number;
  damage_resistances_arr: string[];
  damage_immunities_arr: string[];
  condition_immunities_arr: string[];
}

const BLANK_FORM: MonsterForm = {
  name: "",
  size: "Medium",
  type: "humanoid",
  alignment: "",
  hp: 10,
  ac: 12,
  speed: 30,
  cr: "0",
  xp: 0,
  str_score: 10, dex_score: 10, con_score: 10,
  int_score: 10, wis_score: 10, cha_score: 10,
  special_abilities: [],
  actions: [],
  legendary_actions: [],
  damage_resistances: "",
  damage_immunities: "",
  condition_immunities: "",
  senses: "",
  languages: "",
};

function abilityMod(score: number) {
  return Math.floor((score - 10) / 2);
}
function modStr(score: number) {
  const m = abilityMod(score);
  return `${score} (${m >= 0 ? "+" : ""}${m})`;
}

function dbRowToForm(row: Record<string, unknown>): MonsterRecord {
  return {
    id: row.id as string,
    portrait_url: (row.portrait_url as string | null) ?? null,
    default_initiative: (row.default_initiative as number) ?? 0,
    name: (row.name as string) ?? "",
    size: (row.size as string) ?? "Medium",
    type: (row.type as string) ?? "humanoid",
    alignment: (row.alignment as string) ?? "",
    hp: (row.hp as number) ?? 10,
    ac: (row.ac as number) ?? 12,
    speed: (row.speed as number) ?? 30,
    cr: (row.cr as string) ?? "0",
    xp: (row.xp as number) ?? 0,
    str_score: (row.str_score as number) ?? 10,
    dex_score: (row.dex_score as number) ?? 10,
    con_score: (row.con_score as number) ?? 10,
    int_score: (row.int_score as number) ?? 10,
    wis_score: (row.wis_score as number) ?? 10,
    cha_score: (row.cha_score as number) ?? 10,
    special_abilities: (row.special_abilities as MonsterSpecialAbility[]) ?? [],
    actions: (row.actions as MonsterAction[]) ?? [],
    legendary_actions: (row.legendary_actions as LegendaryAction[]) ?? [],
    damage_resistances: ((row.damage_resistances as string[]) ?? []).join(", "),
    damage_immunities: ((row.damage_immunities as string[]) ?? []).join(", "),
    condition_immunities: ((row.condition_immunities as string[]) ?? []).join(", "),
    damage_resistances_arr: (row.damage_resistances as string[]) ?? [],
    damage_immunities_arr: (row.damage_immunities as string[]) ?? [],
    condition_immunities_arr: (row.condition_immunities as string[]) ?? [],
    senses: (row.senses as string) ?? "",
    languages: (row.languages as string) ?? "",
  };
}

export default function DmMonstersPage() {
  const { campaign } = useCampaign();
  const { user } = useAuth();
  const [monsters, setMonsters] = useState<MonsterRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<MonsterRecord | null>(null);
  const [form, setForm] = useState<MonsterForm>({ ...BLANK_FORM });
  const [saving, setSaving] = useState(false);

  // Portrait state for the dialog
  const [portraitFile, setPortraitFile] = useState<File | null>(null);
  const [portraitPreview, setPortraitPreview] = useState<string | null>(null);
  const [uploadingPortrait, setUploadingPortrait] = useState(false);
  const portraitInputRef = useRef<HTMLInputElement>(null);

  // D&D API import
  const [importQuery, setImportQuery] = useState("");
  const [importResults, setImportResults] = useState<DndMonsterSummary[]>([]);
  const [importSearching, setImportSearching] = useState(false);
  const [importLoading, setImportLoading] = useState<string | null>(null);
  const importTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Library filter
  const [filter, setFilter] = useState("");

  async function loadMonsters() {
    if (!campaign) return;
    const { data } = await supabase
      .from("custom_monsters")
      .select("*")
      .eq("campaign_id", campaign.id)
      .order("name");
    setMonsters((data ?? []).map((r) => dbRowToForm(r as Record<string, unknown>)));
    setLoading(false);
  }

  useEffect(() => {
    loadMonsters();
  }, [campaign?.id]);

  // Debounced D&D API search
  useEffect(() => {
    if (importTimer.current) clearTimeout(importTimer.current);
    if (!importQuery.trim()) { setImportResults([]); return; }
    importTimer.current = setTimeout(async () => {
      setImportSearching(true);
      const results = await searchMonsters(importQuery);
      setImportResults(results.slice(0, 15));
      setImportSearching(false);
    }, 400);
    return () => { if (importTimer.current) clearTimeout(importTimer.current); };
  }, [importQuery]);

  async function importMonster(summary: DndMonsterSummary) {
    setImportLoading(summary.index);
    const m = await getMonster(summary.index);
    if (m) {
      const db = monsterToDbForm(m);
      setForm({
        name: db.name,
        size: db.size,
        type: db.type,
        alignment: db.alignment ?? "",
        hp: db.hp,
        ac: db.ac,
        speed: db.speed,
        cr: db.cr,
        xp: db.xp,
        str_score: db.str_score,
        dex_score: db.dex_score,
        con_score: db.con_score,
        int_score: db.int_score,
        wis_score: db.wis_score,
        cha_score: db.cha_score,
        special_abilities: db.special_abilities as MonsterSpecialAbility[],
        actions: db.actions as MonsterAction[],
        legendary_actions: db.legendary_actions as LegendaryAction[],
        damage_resistances: db.damage_resistances.join(", "),
        damage_immunities: db.damage_immunities.join(", "),
        condition_immunities: db.condition_immunities.join(", "),
        senses: db.senses ?? "",
        languages: db.languages ?? "",
      });
      setImportQuery("");
      setImportResults([]);
    }
    setImportLoading(null);
  }

  function openCreate() {
    setEditTarget(null);
    setForm({ ...BLANK_FORM });
    setPortraitFile(null);
    setPortraitPreview(null);
    setImportQuery("");
    setImportResults([]);
    setDialogOpen(true);
  }

  function openEdit(m: MonsterRecord) {
    setEditTarget(m);
    setForm({
      name: m.name, size: m.size, type: m.type, alignment: m.alignment,
      hp: m.hp, ac: m.ac, speed: m.speed, cr: m.cr, xp: m.xp,
      str_score: m.str_score, dex_score: m.dex_score, con_score: m.con_score,
      int_score: m.int_score, wis_score: m.wis_score, cha_score: m.cha_score,
      special_abilities: m.special_abilities, actions: m.actions,
      legendary_actions: m.legendary_actions,
      damage_resistances: m.damage_resistances,
      damage_immunities: m.damage_immunities,
      condition_immunities: m.condition_immunities,
      senses: m.senses, languages: m.languages,
    });
    setPortraitFile(null);
    setPortraitPreview(m.portrait_url);
    setImportQuery("");
    setImportResults([]);
    setDialogOpen(true);
  }

  function handlePortraitChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPortraitFile(file);
    setPortraitPreview(URL.createObjectURL(file));
  }

  async function uploadPortrait(monsterId: string, file: File): Promise<string | null> {
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${user!.id}/${monsterId}.${ext}`;
    const { error } = await supabase.storage
      .from("monster-portraits")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (error) return null;
    const { data } = supabase.storage.from("monster-portraits").getPublicUrl(path);
    return data.publicUrl;
  }

  async function handleSave() {
    if (!campaign || !form.name.trim()) return;
    setSaving(true);

    const dexMod = abilityMod(form.dex_score);
    const payload = {
      campaign_id: campaign.id,
      name: form.name.trim(),
      size: form.size,
      type: form.type,
      alignment: form.alignment || null,
      hp: form.hp,
      ac: form.ac,
      speed: form.speed,
      cr: form.cr,
      xp: form.xp,
      default_initiative: dexMod,
      str_score: form.str_score,
      dex_score: form.dex_score,
      con_score: form.con_score,
      int_score: form.int_score,
      wis_score: form.wis_score,
      cha_score: form.cha_score,
      actions: form.actions,
      special_abilities: form.special_abilities,
      legendary_actions: form.legendary_actions,
      damage_resistances: form.damage_resistances
        ? form.damage_resistances.split(",").map((s) => s.trim()).filter(Boolean)
        : [],
      damage_immunities: form.damage_immunities
        ? form.damage_immunities.split(",").map((s) => s.trim()).filter(Boolean)
        : [],
      condition_immunities: form.condition_immunities
        ? form.condition_immunities.split(",").map((s) => s.trim()).filter(Boolean)
        : [],
      senses: form.senses || null,
      languages: form.languages || null,
    };

    let monsterId: string;

    if (editTarget) {
      await supabase.from("custom_monsters").update(payload).eq("id", editTarget.id);
      monsterId = editTarget.id;
    } else {
      const { data } = await supabase
        .from("custom_monsters")
        .insert(payload)
        .select("id")
        .single();
      monsterId = data?.id;
    }

    if (monsterId && portraitFile) {
      setUploadingPortrait(true);
      const url = await uploadPortrait(monsterId, portraitFile);
      if (url) {
        await supabase
          .from("custom_monsters")
          .update({ portrait_url: url })
          .eq("id", monsterId);
      }
      setUploadingPortrait(false);
    }

    setSaving(false);
    setDialogOpen(false);
    await loadMonsters();
  }

  async function handleDelete(id: string) {
    await supabase.from("custom_monsters").delete().eq("id", id);
    setMonsters((prev) => prev.filter((m) => m.id !== id));
  }

  function setFormField<K extends keyof MonsterForm>(key: K, value: MonsterForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // Action list helpers
  function addAction() {
    setForm((prev) => ({
      ...prev,
      actions: [...prev.actions, { name: "", desc: "" }],
    }));
  }
  function updateAction(idx: number, field: keyof MonsterAction, value: string | number | undefined) {
    setForm((prev) => ({
      ...prev,
      actions: prev.actions.map((a, i) => i === idx ? { ...a, [field]: value } : a),
    }));
  }
  function removeAction(idx: number) {
    setForm((prev) => ({ ...prev, actions: prev.actions.filter((_, i) => i !== idx) }));
  }

  function addSpecialAbility() {
    setForm((prev) => ({
      ...prev,
      special_abilities: [...prev.special_abilities, { name: "", desc: "" }],
    }));
  }
  function updateSpecialAbility(idx: number, field: keyof MonsterSpecialAbility, value: string) {
    setForm((prev) => ({
      ...prev,
      special_abilities: prev.special_abilities.map((a, i) => i === idx ? { ...a, [field]: value } : a),
    }));
  }
  function removeSpecialAbility(idx: number) {
    setForm((prev) => ({ ...prev, special_abilities: prev.special_abilities.filter((_, i) => i !== idx) }));
  }

  function addLegendaryAction() {
    setForm((prev) => ({
      ...prev,
      legendary_actions: [...prev.legendary_actions, { name: "", desc: "" }],
    }));
  }
  function updateLegendaryAction(idx: number, field: keyof LegendaryAction, value: string) {
    setForm((prev) => ({
      ...prev,
      legendary_actions: prev.legendary_actions.map((a, i) => i === idx ? { ...a, [field]: value } : a),
    }));
  }
  function removeLegendaryAction(idx: number) {
    setForm((prev) => ({ ...prev, legendary_actions: prev.legendary_actions.filter((_, i) => i !== idx) }));
  }

  const filtered = filter.trim()
    ? monsters.filter((m) => m.name.toLowerCase().includes(filter.toLowerCase()))
    : monsters;

  if (!campaign) return <NoCampaignMessage />;

  if (loading) {
    return (
      <div className="px-4 sm:px-6 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-9 w-32" />
        </div>
        <Skeleton className="h-9 w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  const AbilityInput = ({
    label, scoreKey,
  }: {
    label: string;
    scoreKey: keyof Pick<MonsterForm, "str_score" | "dex_score" | "con_score" | "int_score" | "wis_score" | "cha_score">;
  }) => (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        min={1}
        max={30}
        value={form[scoreKey]}
        onChange={(e) => setFormField(scoreKey, parseInt(e.target.value) || 10)}
        className="text-center"
      />
      <p className="text-xs text-center text-muted-foreground">
        {modStr(form[scoreKey])}
      </p>
    </div>
  );

  return (
    <div className="px-4 sm:px-6 py-8 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Monster Library</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Build and manage the campaign's monster roster. Import from D&amp;D 5e or create custom stat blocks.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          New Monster
        </Button>
      </div>

      <Input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filter monsters…"
        className="max-w-sm"
      />

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
            <Skull className="h-12 w-12 text-muted-foreground opacity-30" />
            <p className="text-muted-foreground text-sm">
              {monsters.length === 0
                ? "No monsters yet. Import from D&D 5e SRD or create a custom monster."
                : "No matches."}
            </p>
            <Button variant="outline" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Add your first monster
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((m) => (
            <Card
              key={m.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => openEdit(m)}
            >
              <CardContent className="p-4 flex items-start gap-3">
                {/* Portrait thumbnail */}
                <div className="h-14 w-14 shrink-0 rounded-md border overflow-hidden bg-muted flex items-center justify-center text-lg font-bold text-muted-foreground">
                  {m.portrait_url ? (
                    <img src={m.portrait_url} alt={m.name} className="h-full w-full object-cover" />
                  ) : (
                    m.name.slice(0, 2).toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{m.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{m.size} {m.type}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <Badge variant="outline" className="text-xs">CR {m.cr}</Badge>
                    <span className="text-xs text-muted-foreground">HP {m.hp}</span>
                    <span className="text-xs text-muted-foreground">AC {m.ac}</span>
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="shrink-0 h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={(e) => { e.stopPropagation(); handleDelete(m.id); }}
                  title="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Create / Edit Dialog ──────────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editTarget ? `Edit: ${editTarget.name}` : "New Monster"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            {/* ── D&D API import ── */}
            <div className="border rounded-lg p-3 space-y-2 bg-muted/20">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Import from D&amp;D 5e SRD
              </p>
              <div className="relative">
                <Input
                  value={importQuery}
                  onChange={(e) => setImportQuery(e.target.value)}
                  placeholder="Search monsters… (e.g. goblin, beholder)"
                />
                {importSearching && (
                  <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
              {importResults.length > 0 && (
                <div className="border border-border divide-y divide-border max-h-40 overflow-y-auto">
                  {importResults.map((r) => {
                    const isLoading = importLoading === r.index;
                    return (
                      <Button
                        key={r.index}
                        variant="ghost"
                        size="sm"
                        className="w-full justify-between h-auto px-3 py-2 text-sm font-normal"
                        onClick={() => importMonster(r)}
                        disabled={isLoading}
                      >
                        <span>{r.name}</span>
                        {isLoading ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Search className="h-3 w-3 text-muted-foreground" />
                        )}
                      </Button>
                    );
                  })}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Selecting a monster pre-fills all fields below. You can then customize and save.
              </p>
            </div>

            <Separator />

            {/* ── Portrait ── */}
            <div className="flex items-start gap-4">
              <div className="relative group">
                <div
                  className="h-20 w-20 rounded-lg border-2 border-dashed border-border overflow-hidden bg-muted flex items-center justify-center text-2xl font-bold text-muted-foreground cursor-pointer"
                  onClick={() => portraitInputRef.current?.click()}
                >
                  {portraitPreview ? (
                    <img src={portraitPreview} alt="portrait" className="h-full w-full object-cover" />
                  ) : (
                    form.name.slice(0, 2).toUpperCase() || <Camera className="h-6 w-6" />
                  )}
                </div>
                <button
                  className="absolute inset-0 rounded-lg bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                  onClick={() => portraitInputRef.current?.click()}
                  type="button"
                >
                  <Camera className="h-5 w-5 text-white" />
                </button>
                <input
                  ref={portraitInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handlePortraitChange}
                />
              </div>
              <div className="flex-1 space-y-2">
                <div className="space-y-1">
                  <Label className="text-xs">Name *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setFormField("name", e.target.value)}
                    placeholder="Monster name"
                    autoFocus
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Size</Label>
                    <Select value={form.size} onValueChange={(v) => setFormField("size", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {SIZES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Type</Label>
                    <Select value={form.type} onValueChange={(v) => setFormField("type", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Basic stats ── */}
            <div className="grid grid-cols-5 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">HP</Label>
                <Input type="number" min={1} value={form.hp}
                  onChange={(e) => setFormField("hp", parseInt(e.target.value) || 1)}
                  className="text-center" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">AC</Label>
                <Input type="number" min={1} value={form.ac}
                  onChange={(e) => setFormField("ac", parseInt(e.target.value) || 1)}
                  className="text-center" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Speed</Label>
                <Input type="number" min={0} value={form.speed}
                  onChange={(e) => setFormField("speed", parseInt(e.target.value) || 0)}
                  className="text-center" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">CR</Label>
                <Input value={form.cr}
                  onChange={(e) => setFormField("cr", e.target.value)}
                  className="text-center" placeholder="0" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">XP</Label>
                <Input type="number" min={0} value={form.xp}
                  onChange={(e) => setFormField("xp", parseInt(e.target.value) || 0)}
                  className="text-center" />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Alignment</Label>
              <Input value={form.alignment}
                onChange={(e) => setFormField("alignment", e.target.value)}
                placeholder="e.g. neutral evil" />
            </div>

            {/* ── Ability Scores ── */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Ability Scores
              </p>
              <div className="grid grid-cols-6 gap-2">
                <AbilityInput label="STR" scoreKey="str_score" />
                <AbilityInput label="DEX" scoreKey="dex_score" />
                <AbilityInput label="CON" scoreKey="con_score" />
                <AbilityInput label="INT" scoreKey="int_score" />
                <AbilityInput label="WIS" scoreKey="wis_score" />
                <AbilityInput label="CHA" scoreKey="cha_score" />
              </div>
            </div>

            {/* ── Special Abilities ── */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Special Abilities
                </p>
                <Button variant="outline" size="sm" onClick={addSpecialAbility}>
                  <Plus className="h-3 w-3 mr-1" />Add
                </Button>
              </div>
              <div className="space-y-3">
                {form.special_abilities.map((sa, i) => (
                  <div key={i} className="border rounded-md p-2 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Input
                        value={sa.name}
                        onChange={(e) => updateSpecialAbility(i, "name", e.target.value)}
                        placeholder="Ability name"
                        className="flex-1"
                      />
                      <Button size="icon" variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                        onClick={() => removeSpecialAbility(i)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <Textarea
                      value={sa.desc}
                      onChange={(e) => updateSpecialAbility(i, "desc", e.target.value)}
                      placeholder="Description…"
                      rows={2}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* ── Actions ── */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Actions
                </p>
                <Button variant="outline" size="sm" onClick={addAction}>
                  <Plus className="h-3 w-3 mr-1" />Add
                </Button>
              </div>
              <div className="space-y-3">
                {form.actions.map((action, i) => (
                  <div key={i} className="border rounded-md p-2 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Input
                        value={action.name}
                        onChange={(e) => updateAction(i, "name", e.target.value)}
                        placeholder="Action name"
                        className="flex-1"
                      />
                      <Button size="icon" variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                        onClick={() => removeAction(i)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <Textarea
                      value={action.desc}
                      onChange={(e) => updateAction(i, "desc", e.target.value)}
                      placeholder="Description…"
                      rows={2}
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Attack Bonus</Label>
                        <Input
                          type="number"
                          value={action.attack_bonus ?? ""}
                          onChange={(e) => updateAction(i, "attack_bonus", e.target.value ? parseInt(e.target.value) : undefined)}
                          placeholder="—"
                          className="text-center"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Damage Dice</Label>
                        <Input
                          value={action.damage_dice ?? ""}
                          onChange={(e) => updateAction(i, "damage_dice", e.target.value || undefined)}
                          placeholder="e.g. 1d6+2"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Damage Type</Label>
                        <Input
                          value={action.damage_type ?? ""}
                          onChange={(e) => updateAction(i, "damage_type", e.target.value || undefined)}
                          placeholder="e.g. Slashing"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Legendary Actions ── */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Legendary Actions
                </p>
                <Button variant="outline" size="sm" onClick={addLegendaryAction}>
                  <Plus className="h-3 w-3 mr-1" />Add
                </Button>
              </div>
              <div className="space-y-3">
                {form.legendary_actions.map((la, i) => (
                  <div key={i} className="border rounded-md p-2 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Input
                        value={la.name}
                        onChange={(e) => updateLegendaryAction(i, "name", e.target.value)}
                        placeholder="Action name"
                        className="flex-1"
                      />
                      <Button size="icon" variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                        onClick={() => removeLegendaryAction(i)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <Textarea
                      value={la.desc}
                      onChange={(e) => updateLegendaryAction(i, "desc", e.target.value)}
                      placeholder="Description…"
                      rows={2}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* ── Traits & Details ── */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Traits &amp; Details
              </p>
              <div className="space-y-1">
                <Label className="text-xs">Damage Resistances (comma-separated)</Label>
                <Input
                  value={form.damage_resistances}
                  onChange={(e) => setFormField("damage_resistances", e.target.value)}
                  placeholder="e.g. fire, cold, bludgeoning from nonmagical weapons"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Damage Immunities (comma-separated)</Label>
                <Input
                  value={form.damage_immunities}
                  onChange={(e) => setFormField("damage_immunities", e.target.value)}
                  placeholder="e.g. poison, necrotic"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Condition Immunities (comma-separated)</Label>
                <Input
                  value={form.condition_immunities}
                  onChange={(e) => setFormField("condition_immunities", e.target.value)}
                  placeholder="e.g. poisoned, frightened"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Senses</Label>
                  <Input
                    value={form.senses}
                    onChange={(e) => setFormField("senses", e.target.value)}
                    placeholder="e.g. darkvision 60 ft."
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Languages</Label>
                  <Input
                    value={form.languages}
                    onChange={(e) => setFormField("languages", e.target.value)}
                    placeholder="e.g. Common, Goblin"
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSave}
              disabled={saving || !form.name.trim() || uploadingPortrait}
            >
              {saving || uploadingPortrait ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving…
                </>
              ) : (
                editTarget ? "Save Changes" : "Create Monster"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
