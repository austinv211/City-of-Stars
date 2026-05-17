import { Button } from "@/core/components/ui/button";
import { Input } from "@/core/components/ui/input";
import { Label } from "@/core/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/core/components/ui/select";
import { SPECIES, CLASSES } from "../../data/dnd2024.constants";
import type { WizardState, WizardAction } from "../../types/character.types";

interface Props {
  state: WizardState;
  dispatch: React.Dispatch<WizardAction>;
  onNext: () => void;
}

export function Step1_Identity({ state, dispatch, onNext }: Props) {
  const selectedClass = CLASSES.find((c) => c.name === state.characterClass);

  const isValid =
    state.name.trim().length > 0 &&
    state.species.length > 0 &&
    state.characterClass.length > 0;

  function set(field: keyof WizardState, value: string) {
    dispatch({ type: "SET_FIELD", field, value });
  }

  function handleClassChange(value: string) {
    set("characterClass", value);
    dispatch({ type: "SET_FIELD", field: "subclass", value: "" });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="char-name">Character Name</Label>
        <Input
          id="char-name"
          placeholder="Enter your character's name"
          value={state.name}
          onChange={(e) => set("name", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>Species</Label>
        <Select value={state.species} onValueChange={(v) => set("species", v)}>
          <SelectTrigger>
            <SelectValue placeholder="Choose a species" />
          </SelectTrigger>
          <SelectContent>
            {SPECIES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          2024 rules: species grant no ability score increases
        </p>
      </div>

      <div className="space-y-2">
        <Label>Class</Label>
        <Select value={state.characterClass} onValueChange={handleClassChange}>
          <SelectTrigger>
            <SelectValue placeholder="Choose a class" />
          </SelectTrigger>
          <SelectContent>
            {CLASSES.map((c) => (
              <SelectItem key={c.name} value={c.name}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedClass && (
          <p className="text-xs text-muted-foreground">
            Hit die: d{selectedClass.hitDie} · {selectedClass.skillCount} skill proficiencies
          </p>
        )}
      </div>

      {selectedClass && (
        <div className="space-y-2">
          <Label>Subclass <span className="text-muted-foreground">(optional)</span></Label>
          <Select value={state.subclass} onValueChange={(v) => set("subclass", v)}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a subclass (optional)" />
            </SelectTrigger>
            <SelectContent>
              {selectedClass.subclasses.map((sc) => (
                <SelectItem key={sc} value={sc}>
                  {sc}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <Button className="w-full" disabled={!isValid} onClick={onNext}>
        Next: Background
      </Button>
    </div>
  );
}
