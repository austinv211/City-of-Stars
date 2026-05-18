import { useState, useEffect, useRef } from "react";
import { Button } from "@/core/components/ui/button";
import { Input } from "@/core/components/ui/input";
import { Label } from "@/core/components/ui/label";
import { Badge } from "@/core/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/core/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/core/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/core/components/ui/select";
import { Plus, Trash2, Swords, Search, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { searchWeapons, getEquipment, getDamageCantrips, getSpell } from "@/lib/dnd5eApi";
import type { DndEquipmentSummary, DndSpellSummary } from "@/lib/dnd5eApi";
import type { CharacterAttack } from "../types/character.types";

interface Props {
  characterId: string;
  attacks: CharacterAttack[];
  isOwn: boolean;
  onRefresh: () => void;
}

const DAMAGE_TYPES = [
  "slashing", "piercing", "bludgeoning", "fire", "cold", "lightning",
  "poison", "acid", "psychic", "radiant", "necrotic", "thunder", "force",
];
const DICE_SIDES = [4, 6, 8, 10, 12];

interface Draft {
  name: string;
  attack_modifier: number;
  dice_count: number;
  dice_sides: number;
  damage_modifier: number;
  damage_type: string;
  is_ranged: boolean;
  is_spell: boolean;
  notes: string;
}

const BLANK: Draft = {
  name: "", attack_modifier: 0, dice_count: 1, dice_sides: 6,
  damage_modifier: 0, damage_type: "slashing", is_ranged: false, is_spell: false, notes: "",
};

function parseDice(dicePart: string): { count: number; sides: number } {
  const m = dicePart.match(/(\d+)d(\d+)/i);
  return m ? { count: parseInt(m[1]), sides: parseInt(m[2]) } : { count: 1, sides: 6 };
}

function WeaponSearch({ onSelect }: { onSelect: (d: Partial<Draft>) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DndEquipmentSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingIdx, setFetchingIdx] = useState<string | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      setLoading(true);
      const res = await searchWeapons(query);
      setResults(res);
      setLoading(false);
    }, 350);
    return () => { if (debounce.current) clearTimeout(debounce.current); };
  }, [query]);

  async function pick(item: DndEquipmentSummary) {
    setFetchingIdx(item.index);
    const eq = await getEquipment(item.index);
    setFetchingIdx(null);
    if (!eq) { onSelect({ name: item.name }); return; }
    const isWeapon = eq.equipment_category?.name?.toLowerCase() === "weapon";
    const isRanged = eq.weapon_range?.toLowerCase() === "ranged";
    const dmg = eq.damage;
    const { count, sides } = dmg ? parseDice(dmg.damage_dice) : { count: 1, sides: 6 };
    const damageType = dmg?.damage_type?.name?.toLowerCase() ?? "slashing";
    onSelect({
      name: item.name,
      dice_count: count,
      dice_sides: sides,
      damage_type: DAMAGE_TYPES.includes(damageType) ? damageType : "slashing",
      is_ranged: isRanged,
      is_spell: false,
      ...(isWeapon ? {} : {}),
    });
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          className="pl-8 text-sm"
          placeholder="Search weapons (e.g. Dagger, Longsword…)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {loading && <Loader2 className="absolute right-2.5 top-2.5 h-3.5 w-3.5 animate-spin text-muted-foreground" />}
      </div>
      {results.length > 0 && (
        <div className="border rounded-md divide-y max-h-48 overflow-y-auto">
          {results.map((r) => (
            <button
              key={r.index}
              type="button"
              className="w-full px-3 py-2 text-left text-sm hover:bg-muted/60 transition-colors flex items-center justify-between gap-2"
              disabled={fetchingIdx === r.index}
              onClick={() => pick(r)}
            >
              <span>{r.name}</span>
              {fetchingIdx === r.index && <Loader2 className="h-3 w-3 animate-spin shrink-0" />}
            </button>
          ))}
        </div>
      )}
      {query.trim() && !loading && results.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-2">No weapons found</p>
      )}
    </div>
  );
}

function CantripSearch({ onSelect }: { onSelect: (d: Partial<Draft>) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DndSpellSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingIdx, setFetchingIdx] = useState<string | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      setLoading(true);
      const res = await getDamageCantrips(query);
      setResults(res);
      setLoading(false);
    }, 350);
    return () => { if (debounce.current) clearTimeout(debounce.current); };
  }, [query]);

  async function pick(item: DndSpellSummary) {
    setFetchingIdx(item.index);
    const spell = await getSpell(item.index);
    setFetchingIdx(null);
    if (!spell) { onSelect({ name: item.name, is_spell: true }); return; }

    const dmgType = spell.damage?.damage_type?.name?.toLowerCase() ?? "force";
    const normalizedType = DAMAGE_TYPES.includes(dmgType) ? dmgType : "force";

    // Try to parse damage dice from damage_at_character_level[1] or [5]
    const lvl1Dice = spell.damage?.damage_at_character_level?.["1"];
    const { count, sides } = lvl1Dice ? parseDice(lvl1Dice) : { count: 1, sides: 10 };
    const isRanged = spell.attack_type?.toUpperCase() === "RANGED";

    onSelect({
      name: item.name,
      dice_count: count,
      dice_sides: DICE_SIDES.includes(sides) ? sides : 6,
      damage_type: normalizedType,
      is_spell: true,
      is_ranged: isRanged,
    });
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          className="pl-8 text-sm"
          placeholder="Search damage cantrips (e.g. Fire Bolt…)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {loading && <Loader2 className="absolute right-2.5 top-2.5 h-3.5 w-3.5 animate-spin text-muted-foreground" />}
      </div>
      {results.length > 0 && (
        <div className="border rounded-md divide-y max-h-48 overflow-y-auto">
          {results.map((r) => (
            <button
              key={r.index}
              type="button"
              className="w-full px-3 py-2 text-left text-sm hover:bg-muted/60 transition-colors flex items-center justify-between gap-2"
              disabled={fetchingIdx === r.index}
              onClick={() => pick(r)}
            >
              <span>{r.name}</span>
              {fetchingIdx === r.index && <Loader2 className="h-3 w-3 animate-spin shrink-0" />}
            </button>
          ))}
        </div>
      )}
      {!loading && results.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-2">
          {query.trim() ? "No cantrips found" : "Type to search, or add manually in Custom tab"}
        </p>
      )}
    </div>
  );
}

export function AttacksPanel({ characterId, attacks, isOwn, onRefresh }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(BLANK);
  const [saving, setSaving] = useState(false);

  function set<K extends keyof Draft>(field: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [field]: value }));
  }

  function applyApiResult(partial: Partial<Draft>) {
    setDraft((d) => ({ ...d, ...partial }));
  }

  async function addAttack() {
    if (!draft.name.trim()) return;
    setSaving(true);
    await supabase.from("character_attacks").insert({
      character_id: characterId,
      name: draft.name.trim(),
      attack_modifier: draft.attack_modifier,
      dice_count: draft.dice_count,
      dice_sides: draft.dice_sides,
      damage_modifier: draft.damage_modifier,
      damage_type: draft.damage_type,
      is_ranged: draft.is_ranged,
      is_spell: draft.is_spell,
      notes: draft.notes || null,
    });
    setSaving(false);
    setOpen(false);
    setDraft(BLANK);
    onRefresh();
  }

  async function removeAttack(id: string) {
    await supabase.from("character_attacks").delete().eq("id", id);
    onRefresh();
  }

  function formatAttack(a: CharacterAttack) {
    const sign = (n: number) => (n >= 0 ? `+${n}` : `${n}`);
    return `${a.dice_count}d${a.dice_sides}${sign(a.damage_modifier)} ${a.damage_type}`;
  }

  const draftFilled = draft.name.trim().length > 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Weapons &amp; Damage Cantrips
        </h4>
        {isOwn && (
          <Button variant="ghost" size="sm" onClick={() => { setDraft(BLANK); setOpen(true); }}>
            <Plus className="h-3 w-3 mr-1" />
            Add
          </Button>
        )}
      </div>

      {attacks.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
          <Swords className="h-8 w-8 opacity-40" />
          <p className="text-xs">No attacks defined yet</p>
        </div>
      ) : (
        <div className="space-y-1">
          {attacks.map((a) => (
            <div
              key={a.id}
              className="flex items-center gap-2 rounded-md px-3 py-2 hover:bg-muted/50"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">{a.name}</span>
                  {a.is_spell && <Badge variant="secondary" className="text-xs">Spell</Badge>}
                  {a.is_ranged && <Badge variant="outline" className="text-xs">Ranged</Badge>}
                </div>
                <span className="text-xs text-muted-foreground">
                  Hit: {a.attack_modifier >= 0 ? `+${a.attack_modifier}` : a.attack_modifier} · {formatAttack(a)}
                </span>
              </div>
              {isOwn && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => removeAttack(a.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Attack</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="weapon">
            <TabsList className="w-full">
              <TabsTrigger value="weapon" className="flex-1 text-xs">Weapons</TabsTrigger>
              <TabsTrigger value="cantrip" className="flex-1 text-xs">Damage Cantrips</TabsTrigger>
              <TabsTrigger value="custom" className="flex-1 text-xs">Custom</TabsTrigger>
            </TabsList>

            <TabsContent value="weapon" className="space-y-3 pt-3">
              <WeaponSearch onSelect={applyApiResult} />
              {draftFilled && (
                <p className="text-xs text-muted-foreground">
                  Selected: <span className="font-medium text-foreground">{draft.name}</span>
                  {" — adjust modifiers below if needed"}
                </p>
              )}
            </TabsContent>

            <TabsContent value="cantrip" className="space-y-3 pt-3">
              <CantripSearch onSelect={applyApiResult} />
              {draftFilled && (
                <p className="text-xs text-muted-foreground">
                  Selected: <span className="font-medium text-foreground">{draft.name}</span>
                  {" — adjust modifiers below if needed"}
                </p>
              )}
            </TabsContent>

            <TabsContent value="custom" className="pt-3">
              <div className="space-y-1.5">
                <Label>Attack Name</Label>
                <Input
                  value={draft.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="e.g. Pistol, Unarmed Strike"
                />
              </div>
            </TabsContent>
          </Tabs>

          {/* Shared fields shown when name is filled */}
          {draftFilled && (
            <div className="space-y-4 border-t pt-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Attack Roll Modifier</Label>
                  <Input
                    type="number"
                    value={draft.attack_modifier}
                    onChange={(e) => set("attack_modifier", Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Damage Type</Label>
                  <Select value={draft.damage_type} onValueChange={(v) => set("damage_type", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DAMAGE_TYPES.map((t) => (
                        <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Dice Count</Label>
                  <Input
                    type="number"
                    min={1}
                    value={draft.dice_count}
                    onChange={(e) => set("dice_count", Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Dice Sides</Label>
                  <Select value={String(draft.dice_sides)} onValueChange={(v) => set("dice_sides", Number(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DICE_SIDES.map((s) => (
                        <SelectItem key={s} value={String(s)}>d{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Damage Bonus</Label>
                  <Input
                    type="number"
                    value={draft.damage_modifier}
                    onChange={(e) => set("damage_modifier", Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="flex gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_ranged"
                    checked={draft.is_ranged}
                    onChange={(e) => set("is_ranged", e.target.checked)}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="is_ranged">Ranged</Label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_spell"
                    checked={draft.is_spell}
                    onChange={(e) => set("is_spell", e.target.checked)}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="is_spell">Spell / Cantrip</Label>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={addAttack} disabled={saving || !draftFilled}>
              {saving ? "Adding…" : "Add Attack"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
