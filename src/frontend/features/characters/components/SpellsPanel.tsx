import { useState, useEffect, useRef } from "react";
import { Button } from "@/core/components/ui/button";
import { Input } from "@/core/components/ui/input";
import { Label } from "@/core/components/ui/label";
import { Badge } from "@/core/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/core/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/core/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/core/components/ui/dialog";
import { Separator } from "@/core/components/ui/separator";
import { Plus, Trash2, Wand2, Search, Loader2, Zap } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { searchSpells, getSpell, searchLocalSpells } from "@/lib/dnd5eApi";
import { maxPreparedSpells } from "../data/dnd2024.constants";
import type { DndSpellSummary, SrdSpell } from "@/lib/dnd5eApi";
import type { CharacterSpell, CharacterSpellSlot } from "../types/character.types";

interface Props {
  characterId: string;
  characterClass: string;
  level: number;
  spellcastingAbility: string | null;
  spellAttackMod: number;
  spellSaveDc: number;
  spells: CharacterSpell[];
  slots: CharacterSpellSlot[];
  expend: (spellLevel: number) => Promise<void>;
  recover: (spellLevel: number) => Promise<void>;
  isOwn: boolean;
  onRefresh: () => void;
}

const ABILITIES = ["intelligence", "wisdom", "charisma"];
const SPELL_LEVELS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const LEVEL_LABELS: Record<number, string> = {
  0: "Cantrips",
  1: "1st Level",
  2: "2nd Level",
  3: "3rd Level",
  4: "4th Level",
  5: "5th Level",
  6: "6th Level",
  7: "7th Level",
  8: "8th Level",
  9: "9th Level",
};

interface SpellDraft {
  name: string;
  level: number;
  school: string;
  is_prepared: boolean;
  is_ritual: boolean;
  concentration: boolean;
  casting_time: string;
  range_text: string;
  components: string;
  description: string;
  damage_type: string;
  attack_type: string;
  damage_dice: string;
}

const BLANK_DRAFT: SpellDraft = {
  name: "",
  level: 0,
  school: "",
  is_prepared: false,
  is_ritual: false,
  concentration: false,
  casting_time: "1 action",
  range_text: "",
  components: "",
  description: "",
  damage_type: "",
  attack_type: "",
  damage_dice: "",
};

function SpellRow({
  spell,
  isOwn,
  onDelete,
  onTogglePrepared,
}: {
  spell: CharacterSpell;
  isOwn: boolean;
  onDelete: () => void;
  onTogglePrepared: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-md border px-3 py-2 space-y-1">
      <div className="flex items-start gap-2">
        {spell.level > 0 && isOwn && (
          <button
            onClick={onTogglePrepared}
            title={spell.is_prepared ? "Prepared — click to unprepare" : "Unprepared"}
            className={`mt-0.5 h-3 w-3 rounded-full shrink-0 border transition-colors ${
              spell.is_prepared ? "bg-primary border-primary" : "border-muted-foreground"
            }`}
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              className="text-sm font-medium hover:underline text-left"
              onClick={() => setExpanded((v) => !v)}
            >
              {spell.name}
            </button>
            {spell.concentration && (
              <Badge variant="outline" className="text-xs px-1 py-0">Conc.</Badge>
            )}
            {spell.is_ritual && (
              <Badge variant="outline" className="text-xs px-1 py-0">Ritual</Badge>
            )}
            {spell.attack_type && (
              <Badge variant="secondary" className="text-xs px-1 py-0 capitalize">
                {spell.attack_type}
              </Badge>
            )}
            {spell.damage_type && (
              <Badge variant="secondary" className="text-xs px-1 py-0 capitalize">
                {spell.damage_type}
              </Badge>
            )}
          </div>
          {expanded && (
            <div className="mt-1.5 space-y-1 text-xs text-muted-foreground">
              {spell.casting_time && <p>Cast: {spell.casting_time}</p>}
              {spell.range_text && <p>Range: {spell.range_text}</p>}
              {spell.components?.length && <p>Components: {spell.components.join(", ")}</p>}
              {spell.school && <p>School: {spell.school}</p>}
              {spell.description && (
                <p className="whitespace-pre-wrap leading-relaxed">{spell.description}</p>
              )}
            </div>
          )}
        </div>
        {isOwn && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}

export function SpellsPanel({
  characterId,
  characterClass,
  level,
  spellcastingAbility,
  spellAttackMod,
  spellSaveDc,
  spells,
  slots,
  expend,
  recover,
  isOwn,
  onRefresh,
}: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<SpellDraft>(BLANK_DRAFT);
  const [saving, setSaving] = useState(false);

  // Search state — local SRD DB preferred, external API as fallback
  const [query, setQuery] = useState("");
  const [localResults, setLocalResults] = useState<SrdSpell[]>([]);
  const [apiResults, setApiResults] = useState<DndSpellSummary[]>([]);
  const [searching, setSearching] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Spellcasting ability edit state
  const [editingAbility, setEditingAbility] = useState(false);
  const [abilitySaving, setAbilitySaving] = useState(false);
  const [abilityDraft, setAbilityDraft] = useState(spellcastingAbility ?? "");

  useEffect(() => {
    if (!open) { setQuery(""); setLocalResults([]); setApiResults([]); }
  }, [open]);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (!query.trim()) { setLocalResults([]); setApiResults([]); return; }
    timer.current = setTimeout(async () => {
      setSearching(true);
      const local = await searchLocalSpells(query);
      if (local.length > 0) {
        setLocalResults(local.slice(0, 15));
        setApiResults([]);
      } else {
        setLocalResults([]);
        const res = await searchSpells(query);
        setApiResults(res.slice(0, 15));
      }
      setSearching(false);
    }, 400);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [query]);

  function set<K extends keyof SpellDraft>(field: K, value: SpellDraft[K]) {
    setDraft((d) => ({ ...d, [field]: value }));
  }

  function pickLocalSpell(s: SrdSpell) {
    setDraft({
      name: s.name,
      level: s.level ?? 0,
      school: s.school ?? "",
      is_prepared: false,
      is_ritual: s.ritual,
      concentration: s.concentration,
      casting_time: s.casting_time ?? "",
      range_text: s.range_text ?? "",
      components: s.components?.join(", ") ?? "",
      description: s.description ?? "",
      damage_type: s.damage_type ?? "",
      attack_type: s.attack_type ?? "",
      damage_dice: s.damage_dice ?? "",
    });
    setQuery("");
    setLocalResults([]);
  }

  async function pickApiSpell(summary: DndSpellSummary) {
    const s = await getSpell(summary.index);
    if (!s) return;
    const baseDamageDice =
      s.level === 0
        ? (s.damage?.damage_at_character_level?.["1"] ?? "")
        : (s.damage?.damage_at_slot_level?.[String(s.level)] ?? "");
    setDraft({
      name: s.name,
      level: s.level,
      school: s.school?.name ?? "",
      is_prepared: false,
      is_ritual: s.ritual,
      concentration: s.concentration,
      casting_time: s.casting_time,
      range_text: s.range,
      components: s.components?.join(", ") ?? "",
      description: s.desc?.join("\n\n") ?? "",
      damage_type: s.damage?.damage_type?.name ?? "",
      attack_type: s.attack_type ?? "",
      damage_dice: baseDamageDice,
    });
    setQuery("");
    setApiResults([]);
  }

  async function saveSpell() {
    if (!draft.name.trim()) return;
    setSaving(true);
    await supabase.from("character_spells").insert({
      character_id: characterId,
      name: draft.name.trim(),
      level: draft.level,
      school: draft.school || null,
      is_prepared: draft.level === 0 ? true : draft.is_prepared,
      is_ritual: draft.is_ritual,
      concentration: draft.concentration,
      casting_time: draft.casting_time || null,
      range_text: draft.range_text || null,
      components: draft.components
        ? draft.components.split(",").map((c) => c.trim()).filter(Boolean)
        : null,
      description: draft.description || null,
      damage_type: draft.damage_type || null,
      attack_type: draft.attack_type || null,
      damage_dice: draft.damage_dice || null,
    });
    setSaving(false);
    setOpen(false);
    setDraft(BLANK_DRAFT);
    onRefresh();
  }

  async function deleteSpell(id: string) {
    await supabase.from("character_spells").delete().eq("id", id);
    onRefresh();
  }

  async function togglePrepared(spell: CharacterSpell) {
    await supabase
      .from("character_spells")
      .update({ is_prepared: !spell.is_prepared })
      .eq("id", spell.id);
    onRefresh();
  }

  async function saveAbility() {
    setAbilitySaving(true);
    await supabase
      .from("characters")
      .update({ spellcasting_ability: abilityDraft || null })
      .eq("id", characterId);
    setAbilitySaving(false);
    setEditingAbility(false);
    onRefresh();
  }

  const cantrips = spells.filter((s) => s.level === 0);
  const leveled = spells.filter((s) => s.level > 0);
  // Prepared-spell limit (2024): count prepared level-1+ spells against the class table.
  const preparedLimit = maxPreparedSpells(characterClass, level);
  const preparedCount = leveled.filter((s) => s.is_prepared).length;
  const overPrepared = preparedLimit != null && preparedCount > preparedLimit;
  const preparedByLevel = SPELL_LEVELS.slice(1).reduce<Record<number, CharacterSpell[]>>(
    (acc, lvl) => {
      acc[lvl] = leveled.filter((s) => s.level === lvl);
      return acc;
    },
    {}
  );
  const activeLevels = SPELL_LEVELS.slice(1).filter((l) => preparedByLevel[l].length > 0);

  return (
    <div className="space-y-4">
      {/* Header + spellcasting info */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Cantrips &amp; Prepared Spells
        </h4>
        <div className="flex items-center gap-2">
          {preparedLimit != null && (
            <span
              className={`text-xs ${overPrepared ? "text-destructive font-semibold" : "text-muted-foreground"}`}
              title="Prepared level 1+ spells vs your class limit for this level"
            >
              Prepared {preparedCount}/{preparedLimit}
              {overPrepared && " · over limit"}
            </span>
          )}
          {isOwn && (
            <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
              <Plus className="h-3 w-3 mr-1" />
              Add
            </Button>
          )}
        </div>
      </div>

      {/* Spellcasting stats */}
      {(spellcastingAbility || isOwn) && (
        <div className="flex items-center gap-4 text-sm flex-wrap">
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Spellcasting Ability</p>
            {editingAbility ? (
              <div className="flex items-center gap-1.5">
                <Select value={abilityDraft} onValueChange={setAbilityDraft}>
                  <SelectTrigger className="h-7 w-32 text-xs">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {ABILITIES.map((a) => (
                      <SelectItem key={a} value={a} className="capitalize">{a}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" className="h-7 text-xs" onClick={saveAbility} disabled={abilitySaving}>
                  Save
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingAbility(false)}>
                  ×
                </Button>
              </div>
            ) : (
              <button
                className="font-medium capitalize hover:underline"
                onClick={() => { setAbilityDraft(spellcastingAbility ?? ""); setEditingAbility(true); }}
              >
                {spellcastingAbility ?? <span className="text-muted-foreground italic text-xs">Set ability</span>}
              </button>
            )}
          </div>
          {spellcastingAbility && (
            <>
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Spell Save DC</p>
                <p className="font-bold text-lg">{spellSaveDc}</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Spell Attack</p>
                <p className="font-bold text-lg">
                  {spellAttackMod >= 0 ? `+${spellAttackMod}` : spellAttackMod}
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {spells.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
          <Wand2 className="h-8 w-8 opacity-40" />
          <p className="text-xs">No spells added yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Cantrips */}
          {cantrips.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Zap className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Cantrips
                </p>
              </div>
              <div className="space-y-1">
                {cantrips.map((s) => (
                  <SpellRow
                    key={s.id}
                    spell={s}
                    isOwn={isOwn}
                    onDelete={() => deleteSpell(s.id)}
                    onTogglePrepared={() => togglePrepared(s)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Leveled spells */}
          {activeLevels.map((lvl) => {
            const slotData = slots.find((s) => s.spell_level === lvl);
            const available = slotData ? slotData.slots_total - slotData.slots_expended : null;
            const total = slotData?.slots_total ?? 0;
            return (
            <div key={lvl} className="space-y-1.5">
              <Separator />
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {LEVEL_LABELS[lvl]}
                </p>
                {slotData && total > 0 && (
                  <div className="flex items-center gap-1">
                    {Array.from({ length: total }, (_, i) => {
                      const filled = i < (available ?? 0);
                      return (
                        <button
                          key={i}
                          type="button"
                          title={filled ? "Expend slot" : "Recover slot"}
                          onClick={() => isOwn && (filled ? expend(lvl) : recover(lvl))}
                          className={`w-3 h-3 rounded-full border transition-colors ${
                            filled
                              ? "bg-primary border-primary"
                              : "bg-transparent border-muted-foreground/40 hover:border-primary"
                          } ${!isOwn ? "cursor-default" : "cursor-pointer"}`}
                        />
                      );
                    })}
                    <span className="text-xs text-muted-foreground ml-1">
                      {available}/{total}
                    </span>
                  </div>
                )}
              </div>
              <div className="space-y-1">
                {preparedByLevel[lvl].map((s) => (
                  <SpellRow
                    key={s.id}
                    spell={s}
                    isOwn={isOwn}
                    onDelete={() => deleteSpell(s.id)}
                    onTogglePrepared={() => togglePrepared(s)}
                  />
                ))}
              </div>
            </div>
          );})}
        </div>
      )}

      {/* Add Spell Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Spell or Cantrip</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="search">
            <TabsList className="w-full">
              <TabsTrigger value="search" className="flex-1">
                <Search className="h-3 w-3 mr-1.5" />
                Search D&D
              </TabsTrigger>
              <TabsTrigger value="custom" className="flex-1">Custom</TabsTrigger>
            </TabsList>

            <TabsContent value="search" className="space-y-3 mt-3">
              <div className="relative">
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="e.g. Fire Bolt, Healing Word, Fireball…"
                  autoFocus
                />
                {searching && (
                  <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>

              {(localResults.length > 0 || apiResults.length > 0) && (
                <div className="border rounded-md divide-y max-h-52 overflow-y-auto">
                  {localResults.map((s) => (
                    <button
                      key={s.index}
                      className="w-full text-left px-3 py-2 hover:bg-muted/50 flex items-center justify-between"
                      onClick={() => pickLocalSpell(s)}
                    >
                      <span className="text-sm font-medium">{s.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {s.level === 0 ? "Cantrip" : `Level ${s.level}`}
                      </Badge>
                    </button>
                  ))}
                  {apiResults.map((s) => (
                    <button
                      key={s.index}
                      className="w-full text-left px-3 py-2 hover:bg-muted/50 flex items-center justify-between"
                      onClick={() => pickApiSpell(s)}
                    >
                      <span className="text-sm font-medium">{s.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {s.level === 0 ? "Cantrip" : `Level ${s.level}`}
                      </Badge>
                    </button>
                  ))}
                </div>
              )}

              {draft.name && (
                <div className="border rounded-md p-3 bg-muted/20 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Selected: {draft.name}
                  </p>
                  <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                    <p>Level: {draft.level === 0 ? "Cantrip" : draft.level}</p>
                    {draft.school && <p>School: {draft.school}</p>}
                    {draft.casting_time && <p>Cast: {draft.casting_time}</p>}
                    {draft.range_text && <p>Range: {draft.range_text}</p>}
                    {draft.damage_type && <p>Damage: {draft.damage_type}</p>}
                    {draft.attack_type && <p>Attack: {draft.attack_type}</p>}
                    {draft.damage_dice && <p className="text-primary font-medium">Dice: {draft.damage_dice}</p>}
                  </div>
                  {draft.level > 0 && (
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="checkbox"
                        id="is_prepared_search"
                        checked={draft.is_prepared}
                        onChange={(e) => set("is_prepared", e.target.checked)}
                        className="h-4 w-4"
                      />
                      <Label htmlFor="is_prepared_search" className="text-xs">Mark as prepared</Label>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="custom" className="space-y-3 mt-3">
              <div className="space-y-1.5">
                <Label>Spell Name</Label>
                <Input
                  value={draft.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="e.g. Eldritch Blast"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Level</Label>
                  <Select
                    value={String(draft.level)}
                    onValueChange={(v) => set("level", Number(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SPELL_LEVELS.map((l) => (
                        <SelectItem key={l} value={String(l)}>
                          {l === 0 ? "Cantrip" : `Level ${l}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>School</Label>
                  <Input
                    value={draft.school}
                    onChange={(e) => set("school", e.target.value)}
                    placeholder="e.g. Evocation"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Casting Time</Label>
                  <Input
                    value={draft.casting_time}
                    onChange={(e) => set("casting_time", e.target.value)}
                    placeholder="1 action"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Range</Label>
                  <Input
                    value={draft.range_text}
                    onChange={(e) => set("range_text", e.target.value)}
                    placeholder="60 feet"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Components</Label>
                <Input
                  value={draft.components}
                  onChange={(e) => set("components", e.target.value)}
                  placeholder="V, S, M (e.g. V, S)"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Damage Dice</Label>
                  <Input
                    value={draft.damage_dice}
                    onChange={(e) => set("damage_dice", e.target.value)}
                    placeholder="e.g. 1d10, 8d6"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Damage Type</Label>
                  <Input
                    value={draft.damage_type}
                    onChange={(e) => set("damage_type", e.target.value)}
                    placeholder="e.g. fire, force"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={draft.concentration}
                    onChange={(e) => set("concentration", e.target.checked)}
                    className="h-4 w-4"
                  />
                  Concentration
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={draft.is_ritual}
                    onChange={(e) => set("is_ritual", e.target.checked)}
                    className="h-4 w-4"
                  />
                  Ritual
                </label>
                {draft.level > 0 && (
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={draft.is_prepared}
                      onChange={(e) => set("is_prepared", e.target.checked)}
                      className="h-4 w-4"
                    />
                    Prepared
                  </label>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={saveSpell} disabled={saving || !draft.name.trim()}>
              {saving ? "Adding…" : "Add Spell"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
