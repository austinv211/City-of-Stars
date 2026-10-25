import { Button } from "@/core/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/core/components/ui/select";
import { Sparkles, Brain, Shield } from "lucide-react";
import { COVER_OPTIONS } from "@/features/characters/data/rules2024";
import { useConcentrationSpells } from "../../hooks/useCombatantSpells";
import type { EncounterParticipant } from "../../types/encounter.types";

/** Heroic Inspiration and Concentration (players), and Cover (everyone). */
export function CombatStatus({
  participant,
  locked,
  onSetHeroicInspiration,
  onSetConcentration,
  onSetCover,
}: {
  participant: EncounterParticipant;
  locked: boolean;
  onSetHeroicInspiration: (value: boolean) => void;
  onSetConcentration: (spell: string | null) => void;
  onSetCover: (cover: string) => void;
}) {
  const concentrationSpells = useConcentrationSpells(participant.character_id);
  const concentrationOptions = [
    ...new Set([
      ...(participant.concentrating_on ? [participant.concentrating_on] : []),
      ...concentrationSpells,
    ]),
  ];

  return (
    <div className="divide-y divide-border/40 rounded-md border bg-card/40 text-xs">
      {participant.is_player && (
        <div className="flex items-center justify-between gap-2 px-2.5 py-1.5">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" /> Heroic Inspiration
          </span>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={locked}
            onClick={() => {
              onSetHeroicInspiration(!participant.heroic_inspiration);
            }}
            className={`h-6 border px-2.5 text-xs ${
              participant.heroic_inspiration
                ? "border-secondary/60 bg-secondary/15 text-secondary hover:bg-secondary/25"
                : "border-border bg-transparent text-muted-foreground hover:bg-muted/40"
            }`}
            title="Heroic Inspiration: reroll any die once"
          >
            {participant.heroic_inspiration ? "Available" : "None"}
          </Button>
        </div>
      )}

      {participant.is_player && (
        <div className="flex items-center justify-between gap-2 px-2.5 py-1.5">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Brain className="h-3.5 w-3.5" /> Concentration
          </span>
          <Select
            value={participant.concentrating_on ?? "__none__"}
            onValueChange={(v) => {
              onSetConcentration(v === "__none__" ? null : v);
            }}
            disabled={locked}
          >
            <SelectTrigger className="h-6 w-40 text-xs">
              <SelectValue placeholder="Concentrating…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Not concentrating</SelectItem>
              {concentrationOptions.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 px-2.5 py-1.5">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Shield className="h-3.5 w-3.5" /> Cover
        </span>
        <Select
          value={participant.cover}
          onValueChange={(v) => {
            onSetCover(v);
          }}
          disabled={locked}
        >
          <SelectTrigger className="h-6 w-40 text-xs">
            <SelectValue placeholder="No cover" />
          </SelectTrigger>
          <SelectContent>
            {COVER_OPTIONS.map((c) => (
              <SelectItem key={c.value} value={c.value} className="text-xs">
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
