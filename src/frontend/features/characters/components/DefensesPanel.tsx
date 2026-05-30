import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card";
import { Badge } from "@/core/components/ui/badge";
import { Input } from "@/core/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/core/components/ui/select";
import { X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { CharacterWithScores } from "../types/character.types";
import { abilityModifier } from "../types/character.types";
import { SIZES } from "../data/rules2024";

interface Props {
  character: CharacterWithScores;
  canEdit: boolean;
  onRefresh: () => void;
  strengthScore?: number;
}

const SENSES: { key: "darkvision" | "blindsight" | "tremorsense" | "truesight"; label: string }[] = [
  { key: "darkvision", label: "Darkvision" },
  { key: "blindsight", label: "Blindsight" },
  { key: "tremorsense", label: "Tremorsense" },
  { key: "truesight", label: "Truesight" },
];

const MOVEMENT: { key: "fly_speed" | "swim_speed" | "climb_speed" | "burrow_speed"; label: string }[] = [
  { key: "fly_speed", label: "Fly" },
  { key: "swim_speed", label: "Swim" },
  { key: "climb_speed", label: "Climb" },
  { key: "burrow_speed", label: "Burrow" },
];

const DEFENSES: { key: "damage_resistances" | "damage_immunities" | "damage_vulnerabilities" | "condition_immunities"; label: string }[] = [
  { key: "damage_resistances", label: "Resistances" },
  { key: "damage_immunities", label: "Immunities" },
  { key: "damage_vulnerabilities", label: "Vulnerabilities" },
  { key: "condition_immunities", label: "Condition Immunities" },
];

function TagEditor({
  values, canEdit, onChange,
}: { values: string[]; canEdit: boolean; onChange: (next: string[]) => void }) {
  const [draft, setDraft] = useState("");

  function add() {
    const v = draft.trim();
    if (!v || values.includes(v)) { setDraft(""); return; }
    onChange([...values, v]);
    setDraft("");
  }

  if (!canEdit && values.length === 0) {
    return <span className="text-xs text-muted-foreground italic">None</span>;
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {values.map((v) => (
        <Badge key={v} variant="secondary" className="text-xs gap-1 capitalize">
          {v}
          {canEdit && (
            <button type="button" onClick={() => onChange(values.filter((x) => x !== v))} className="hover:text-destructive">
              <X className="h-3 w-3" />
            </button>
          )}
        </Badge>
      ))}
      {canEdit && (
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          onBlur={add}
          placeholder="add…"
          className="h-6 w-24 text-xs px-2"
        />
      )}
    </div>
  );
}

export function DefensesPanel({ character, canEdit, onRefresh, strengthScore = 10 }: Props) {
  const [busy, setBusy] = useState(false);
  const strMod = abilityModifier(strengthScore);
  const highJump = Math.max(0, 3 + strMod);
  const longJump = strengthScore; // running long jump = STR score in feet

  async function save(updates: Record<string, unknown>) {
    if (busy) return;
    setBusy(true);
    await supabase.from("characters").update(updates).eq("id", character.id);
    setBusy(false);
    onRefresh();
  }

  const sensesShown = SENSES.filter((s) => canEdit || (character[s.key] ?? 0) > 0);
  const movementShown = MOVEMENT.filter((m) => canEdit || (character[m.key] ?? 0) > 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Defenses, Senses &amp; Movement
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Size */}
        <div className="flex items-center gap-3">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground w-20">Size</p>
          {canEdit ? (
            <Select value={character.size ?? "Medium"} onValueChange={(v) => save({ size: v })}>
              <SelectTrigger className="h-8 w-36 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SIZES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          ) : (
            <span className="text-sm font-medium">{character.size ?? "Medium"}</span>
          )}
        </div>

        {/* Jump (derived from Strength) */}
        <div className="flex items-center gap-3">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground w-20">Jump</p>
          <span className="text-sm">
            High <span className="font-medium">{highJump} ft</span>
            <span className="text-muted-foreground/60"> · </span>
            Long <span className="font-medium">{longJump} ft</span>
          </span>
        </div>

        {/* Senses */}
        {(sensesShown.length > 0) && (
          <div className="space-y-1.5">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Senses</p>
            <div className="flex flex-wrap gap-x-6 gap-y-1.5">
              {sensesShown.map(({ key, label }) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{label}</span>
                  {canEdit ? (
                    <Input
                      type="number" min={0}
                      value={character[key] ?? ""}
                      onChange={(e) => save({ [key]: e.target.value === "" ? null : Math.max(0, parseInt(e.target.value) || 0) })}
                      className="h-7 w-16 text-xs"
                      placeholder="ft"
                    />
                  ) : (
                    <span className="text-sm font-medium">{character[key]} ft</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Extra movement */}
        {(movementShown.length > 0) && (
          <div className="space-y-1.5">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Movement (beyond {character.speed} ft walk)</p>
            <div className="flex flex-wrap gap-x-6 gap-y-1.5">
              {movementShown.map(({ key, label }) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{label}</span>
                  {canEdit ? (
                    <Input
                      type="number" min={0}
                      value={character[key] ?? ""}
                      onChange={(e) => save({ [key]: e.target.value === "" ? null : Math.max(0, parseInt(e.target.value) || 0) })}
                      className="h-7 w-16 text-xs"
                      placeholder="ft"
                    />
                  ) : (
                    <span className="text-sm font-medium">{character[key]} ft</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Defenses */}
        <div className="space-y-2.5">
          {DEFENSES.map(({ key, label }) => {
            const values = character[key] ?? [];
            if (!canEdit && values.length === 0) return null;
            return (
              <div key={key} className="flex flex-wrap items-start gap-2">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground w-28 shrink-0 pt-1">{label}</p>
                <TagEditor values={values} canEdit={canEdit} onChange={(next) => save({ [key]: next })} />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
