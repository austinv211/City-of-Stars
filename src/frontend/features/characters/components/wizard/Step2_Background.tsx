import { Button } from "@/core/components/ui/button";
import { Label } from "@/core/components/ui/label";
import { Textarea } from "@/core/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/core/components/ui/select";
import { BACKGROUNDS, ALIGNMENTS } from "../../data/dnd2024.constants";
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
          <p className="text-xs text-muted-foreground">
            Grants +2 and +1 to abilities you choose below
          </p>
        )}
      </div>

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
              <SelectItem key={a} value={a}>
                {a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
