import { useState, useEffect, useRef } from "react";
import { Button } from "@/core/components/ui/button";
import { Input } from "@/core/components/ui/input";
import { Badge } from "@/core/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card";
import { X, Plus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/core/context/AuthContext";
import { logAudit } from "../lib/auditLog";
import { getLanguages, getEquipmentCategory } from "@/lib/dnd5eApi";
import type { Character } from "../types/character.types";

type ProfField = "armor_proficiencies" | "weapon_proficiencies" | "tool_proficiencies" | "languages_known";

const TOOL_LIST = [
  "Alchemist's Supplies", "Brewer's Supplies", "Calligrapher's Supplies", "Carpenter's Tools",
  "Cartographer's Tools", "Cobbler's Tools", "Cook's Utensils", "Glassblower's Tools",
  "Jeweler's Tools", "Leatherworker's Tools", "Mason's Tools", "Painter's Supplies",
  "Potter's Tools", "Smith's Tools", "Tinker's Tools", "Weaver's Tools", "Woodcarver's Tools",
  "Disguise Kit", "Forgery Kit", "Herbalism Kit", "Navigator's Tools", "Poisoner's Kit",
  "Thieves' Tools", "Dice Set", "Playing Card Set",
  "Bagpipes", "Drum", "Dulcimer", "Flute", "Lute", "Lyre", "Horn", "Pan Flute", "Shawm", "Viol",
];

interface TagInputProps {
  label: string;
  values: string[];
  suggestions: string[];
  placeholder: string;
  isOwn: boolean;
  onAdd: (val: string) => void;
  onRemove: (val: string) => void;
}

function TagInput({ label, values, suggestions, placeholder, isOwn, onAdd, onRemove }: TagInputProps) {
  const [query, setQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = query.trim()
    ? suggestions.filter(
        (s) =>
          s.toLowerCase().includes(query.toLowerCase()) &&
          !values.includes(s)
      )
    : [];

  function addValue(val: string) {
    const trimmed = val.trim();
    if (!trimmed || values.includes(trimmed)) return;
    onAdd(trimmed);
    setQuery("");
    setShowSuggestions(false);
  }

  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-1.5">{label}</p>
      <div className="flex flex-wrap gap-1 mb-2">
        {values.map((v) => (
          <Badge key={v} variant="secondary" className="text-xs gap-1 pr-1">
            {v}
            {isOwn && (
              <button
                type="button"
                className="ml-0.5 hover:text-destructive"
                onClick={() => onRemove(v)}
              >
                <X className="h-2.5 w-2.5" />
              </button>
            )}
          </Badge>
        ))}
      </div>
      {isOwn && (
        <div className="relative">
          <div className="flex gap-1">
            <Input
              ref={inputRef}
              className="h-7 text-xs"
              value={query}
              placeholder={placeholder}
              onChange={(e) => { setQuery(e.target.value); setShowSuggestions(true); }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addValue(query);
              }}
            />
            <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => addValue(query)}>
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          {showSuggestions && filtered.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-md max-h-40 overflow-y-auto">
              {filtered.slice(0, 8).map((s) => (
                <button
                  key={s}
                  type="button"
                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent"
                  onMouseDown={() => addValue(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface Props {
  character: Character;
  isOwn: boolean;
  onRefresh: () => void;
}

export function ProficienciesPanel({ character, isOwn, onRefresh }: Props) {
  const { user } = useAuth();
  const [armorList, setArmorList] = useState<string[]>([]);
  const [weaponList, setWeaponList] = useState<string[]>([]);
  const [languageList, setLanguageList] = useState<string[]>([]);

  useEffect(() => {
    getEquipmentCategory("armor").then((items) => setArmorList(items.map((i) => i.name)));
    getEquipmentCategory("weapon").then((items) => setWeaponList(items.map((i) => i.name)));
    getLanguages().then((langs) => setLanguageList(langs.map((l) => l.name)));
  }, []);

  async function update(field: ProfField, newValues: string[]) {
    const oldValues: string[] = character[field] ?? [];
    await supabase.from("characters").update({ [field]: newValues }).eq("id", character.id);
    if (user) {
      await logAudit(character.id, user.id, field, oldValues.join(", "), newValues.join(", "));
    }
    onRefresh();
  }

  function add(field: ProfField, val: string) {
    const current: string[] = character[field] ?? [];
    if (current.includes(val)) return;
    update(field, [...current, val]);
  }

  function remove(field: ProfField, val: string) {
    const current: string[] = character[field] ?? [];
    update(field, current.filter((v) => v !== val));
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Proficiencies &amp; Languages
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <TagInput
          label="Armor Proficiencies"
          values={character.armor_proficiencies}
          suggestions={armorList}
          placeholder="Search armor…"
          isOwn={isOwn}
          onAdd={(v) => add("armor_proficiencies", v)}
          onRemove={(v) => remove("armor_proficiencies", v)}
        />
        <TagInput
          label="Weapon Proficiencies"
          values={character.weapon_proficiencies}
          suggestions={weaponList}
          placeholder="Search weapons…"
          isOwn={isOwn}
          onAdd={(v) => add("weapon_proficiencies", v)}
          onRemove={(v) => remove("weapon_proficiencies", v)}
        />
        <TagInput
          label="Tool Proficiencies"
          values={character.tool_proficiencies}
          suggestions={TOOL_LIST}
          placeholder="Search tools…"
          isOwn={isOwn}
          onAdd={(v) => add("tool_proficiencies", v)}
          onRemove={(v) => remove("tool_proficiencies", v)}
        />
        <TagInput
          label="Languages Known"
          values={character.languages_known}
          suggestions={languageList}
          placeholder="Search languages…"
          isOwn={isOwn}
          onAdd={(v) => add("languages_known", v)}
          onRemove={(v) => remove("languages_known", v)}
        />
      </CardContent>
    </Card>
  );
}
