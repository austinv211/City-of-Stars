import { useEffect, useState } from "react";
import { Button } from "@/core/components/ui/button";
import { Label } from "@/core/components/ui/label";
import { Textarea } from "@/core/components/ui/textarea";
import { Badge } from "@/core/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/core/components/ui/select";
import { BACKGROUNDS, ALIGNMENTS } from "../../data/dnd2024.constants";
import { getSrdBackground, type SrdBackground } from "@/lib/dnd5eApi";
import type { WizardState, WizardAction, AbilityName } from "../../types/character.types";

const ABILITY_LABELS: Record<AbilityName, string> = {
  strength: "Strength",
  dexterity: "Dexterity",
  constitution: "Constitution",
  intelligence: "Intelligence",
  wisdom: "Wisdom",
  charisma: "Charisma",
};

interface Props {
  state: WizardState;
  dispatch: React.Dispatch<WizardAction>;
  onNext: () => void;
}

export function Step2_Background({ state, dispatch, onNext }: Props) {
  const bg = BACKGROUNDS.find((b) => b.name === state.background);
  const [srdBg, setSrdBg] = useState<SrdBackground | null>(null);

  // Load SRD data for the selected background
  useEffect(() => {
    if (!state.background) { setSrdBg(null); return; }
    getSrdBackground(state.background).then(setSrdBg).catch(() => setSrdBg(null));
  }, [state.background]);

  const primaryOptions = bg?.primaryOptions ?? [];
  const secondaryOptions = (bg?.secondaryOptions ?? []).filter(
    (a) => a !== state.backgroundBonusPrimary
  );

  const isValid =
    state.background.length > 0 &&
    state.backgroundBonusPrimary.length > 0 &&
    state.backgroundBonusSecondary.length > 0 &&
    state.backgroundBonusPrimary !== state.backgroundBonusSecondary;

  function set<K extends keyof WizardState>(field: K, value: WizardState[K]) {
    dispatch({ type: "SET_FIELD", field, value });
  }

  function handleBackgroundChange(name: string) {
    const found = BACKGROUNDS.find((b) => b.name === name);
    set("background", name);
    if (found) {
      set("backgroundBonusPrimary", found.primaryOptions[0]);
      const secondary = found.secondaryOptions.find((a) => a !== found.primaryOptions[0]);
      set("backgroundBonusSecondary", secondary ?? found.secondaryOptions[1]);
    }
  }

  function handlePrimaryChange(ability: AbilityName) {
    set("backgroundBonusPrimary", ability);
    if (ability === state.backgroundBonusSecondary && secondaryOptions.length > 0) {
      const next = secondaryOptions.find((a) => a !== ability);
      if (next) set("backgroundBonusSecondary", next);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Background</Label>
        <Select value={state.background} onValueChange={handleBackgroundChange}>
          <SelectTrigger>
            <SelectValue placeholder="Choose a background" />
          </SelectTrigger>
          <SelectContent>
            {BACKGROUNDS.map((b) => (
              <SelectItem key={b.name} value={b.name}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {bg && (
          <p className="text-xs text-muted-foreground italic">{bg.description}</p>
        )}
      </div>

      {/* SRD background detail card */}
      {bg && (
        <div className="rounded-lg border bg-muted/30 p-3 space-y-2 text-sm">
          <div className="flex flex-wrap gap-1.5 items-center">
            <span className="text-xs text-muted-foreground font-medium w-20 shrink-0">Ability Scores</span>
            <div className="flex flex-wrap gap-1">
              {(srdBg?.ability_scores ?? bg.primaryOptions.map(
                (a) => ABILITY_LABELS[a]
              )).map((a) => (
                <Badge key={a} variant="secondary" className="text-xs">{a}</Badge>
              ))}
              {!srdBg && (
                <span className="text-xs text-muted-foreground">(+2 and +1 choices below)</span>
              )}
            </div>
          </div>

          {srdBg?.feat && (
            <div className="flex flex-wrap gap-1.5 items-start">
              <span className="text-xs text-muted-foreground font-medium w-20 shrink-0 pt-0.5">Origin Feat</span>
              <Badge variant="outline" className="text-xs font-normal">{srdBg.feat}</Badge>
            </div>
          )}

          {srdBg?.skill_proficiencies && srdBg.skill_proficiencies.length > 0 && (
            <div className="flex flex-wrap gap-1.5 items-start">
              <span className="text-xs text-muted-foreground font-medium w-20 shrink-0 pt-0.5">Skills</span>
              <div className="flex flex-wrap gap-1">
                {srdBg.skill_proficiencies.map((s) => (
                  <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                ))}
              </div>
            </div>
          )}

          {srdBg?.tool_proficiency && (
            <div className="flex flex-wrap gap-1.5 items-start">
              <span className="text-xs text-muted-foreground font-medium w-20 shrink-0 pt-0.5">Tool</span>
              <span className="text-xs">{srdBg.tool_proficiency}</span>
            </div>
          )}

          {srdBg?.equipment_description && (
            <div className="flex flex-wrap gap-1.5 items-start">
              <span className="text-xs text-muted-foreground font-medium w-20 shrink-0 pt-0.5">Equipment</span>
              <span className="text-xs text-muted-foreground leading-relaxed">{srdBg.equipment_description}</span>
            </div>
          )}

        </div>
      )}

      {bg && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>+2 Ability Score</Label>
            <Select
              value={state.backgroundBonusPrimary}
              onValueChange={(v) => handlePrimaryChange(v as AbilityName)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {primaryOptions.map((a) => (
                  <SelectItem key={a} value={a}>
                    {ABILITY_LABELS[a]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>+1 Ability Score</Label>
            <Select
              value={state.backgroundBonusSecondary}
              onValueChange={(v) => set("backgroundBonusSecondary", v as AbilityName)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {secondaryOptions.map((a) => (
                  <SelectItem key={a} value={a}>
                    {ABILITY_LABELS[a]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label>Alignment <span className="text-muted-foreground">(optional)</span></Label>
        <Select value={state.alignment} onValueChange={(v) => set("alignment", v)}>
          <SelectTrigger>
            <SelectValue placeholder="Choose alignment (optional)" />
          </SelectTrigger>
          <SelectContent>
            {ALIGNMENTS.map((a) => (
              <SelectItem key={a.name} value={a.name}>{a.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {state.alignment && (() => {
          const found = ALIGNMENTS.find((a) => a.name === state.alignment);
          return found ? (
            <p className="text-xs text-muted-foreground italic">{found.description}</p>
          ) : null;
        })()}
      </div>

      <div className="space-y-2">
        <Label>
          Backstory <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          placeholder="Share your character's history, motivations, and goals..."
          value={state.backstory}
          onChange={(e) => set("backstory", e.target.value)}
          rows={5}
        />
      </div>

      <Button className="w-full" disabled={!isValid} onClick={onNext}>
        Next: Ability Scores
      </Button>
    </div>
  );
}
