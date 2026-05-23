import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card";
import { Button } from "@/core/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/core/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/core/components/ui/tooltip";
import { Sparkles, Brain } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { CharacterWithScores } from "../types/character.types";
import {
  SHEET_CONDITIONS, CONDITION_EFFECTS, exhaustionD20Penalty, exhaustionSpeedPenalty,
} from "../data/rules2024";

interface Props {
  character: CharacterWithScores;
  canEdit: boolean;
  concentrationSpells: string[];
  onRefresh: () => void;
}

const NONE = "__none__";

export function StatusPanel({ character, canEdit, concentrationSpells, onRefresh }: Props) {
  const [busy, setBusy] = useState(false);
  const conditions = character.conditions ?? [];
  const exhaustion = character.exhaustion ?? 0;

  async function save(updates: Record<string, unknown>) {
    if (busy) return;
    setBusy(true);
    await supabase.from("characters").update(updates).eq("id", character.id);
    setBusy(false);
    onRefresh();
  }

  function toggleCondition(cond: string) {
    if (!canEdit) return;
    const next = conditions.includes(cond)
      ? conditions.filter((c) => c !== cond)
      : [...conditions, cond];
    save({ conditions: next });
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Status &amp; Conditions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Heroic Inspiration + Exhaustion */}
        <div className="flex flex-wrap items-start gap-6">
          {/* Heroic Inspiration */}
          <div className="space-y-1.5">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Heroic Inspiration</p>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={!canEdit || busy}
              onClick={() => save({ heroic_inspiration: !character.heroic_inspiration })}
              className={`h-8 gap-1.5 border ${
                character.heroic_inspiration
                  ? "border-secondary/60 bg-secondary/15 text-secondary hover:bg-secondary/25"
                  : "border-border bg-transparent text-muted-foreground hover:bg-muted/40"
              }`}
            >
              <Sparkles className={`h-3.5 w-3.5 ${character.heroic_inspiration ? "fill-current" : ""}`} />
              {character.heroic_inspiration ? "Available" : "None"}
            </Button>
          </div>

          {/* Exhaustion */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Exhaustion</p>
              {exhaustion > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-[10px] text-destructive cursor-default">
                      ({exhaustionD20Penalty(exhaustion)} d20, {exhaustionSpeedPenalty(exhaustion)} ft)
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-52 text-xs">
                    Each level: −2 to all D20 tests and −5 ft speed. Level 6 = death.
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            <div className="flex gap-1">
              {[0, 1, 2, 3, 4, 5, 6].map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  disabled={!canEdit || busy}
                  onClick={() => save({ exhaustion: lvl })}
                  className={`h-7 w-7 rounded text-xs font-semibold transition-colors ${
                    lvl === exhaustion
                      ? lvl === 0 ? "bg-muted text-foreground" : "bg-destructive/80 text-destructive-foreground"
                      : "bg-muted/40 text-muted-foreground hover:bg-muted"
                  } ${canEdit ? "cursor-pointer" : "cursor-default"}`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Concentration */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Brain className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Concentrating On</p>
          </div>
          {canEdit ? (
            <Select
              value={character.concentrating_on ?? NONE}
              onValueChange={(v) => save({ concentrating_on: v === NONE ? null : v })}
            >
              <SelectTrigger className="h-8 w-full max-w-xs text-sm">
                <SelectValue placeholder="Nothing" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Nothing</SelectItem>
                {concentrationSpells.map((name) => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-sm">
              {character.concentrating_on
                ? <span className="font-medium text-primary">{character.concentrating_on}</span>
                : <span className="text-muted-foreground">Nothing</span>}
            </p>
          )}
        </div>

        {/* Conditions */}
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Conditions</p>
          {!canEdit && conditions.length === 0 && (
            <p className="text-xs text-muted-foreground italic">None</p>
          )}
          <div className="flex flex-wrap gap-1.5">
            {(canEdit ? SHEET_CONDITIONS : conditions).map((cond) => {
              const active = conditions.includes(cond);
              const note = CONDITION_EFFECTS[cond]?.note;
              const chip = (
                <button
                  key={cond}
                  type="button"
                  disabled={!canEdit || busy}
                  onClick={() => toggleCondition(cond)}
                  className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
                    active
                      ? "border-destructive/50 bg-destructive/15 text-destructive"
                      : "border-border bg-muted/30 text-muted-foreground hover:bg-muted"
                  } ${canEdit ? "cursor-pointer" : "cursor-default"}`}
                >
                  {cond}
                </button>
              );
              return note ? (
                <Tooltip key={cond}>
                  <TooltipTrigger asChild>{chip}</TooltipTrigger>
                  <TooltipContent side="top" className="max-w-60 text-xs">{note}</TooltipContent>
                </Tooltip>
              ) : chip;
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
