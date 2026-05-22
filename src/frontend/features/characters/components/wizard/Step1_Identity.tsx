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
import { SPECIES_DATA, CLASSES } from "../../data/dnd2024.constants";
import type { WizardState, WizardAction } from "../../types/character.types";

interface Props {
  state: WizardState;
  dispatch: React.Dispatch<WizardAction>;
  onNext: () => void;
}

export function Step1_Identity({ state, dispatch, onNext }: Props) {
  const selectedClass = CLASSES.find((c) => c.name === state.characterClass);
  const selectedSpecies = SPECIES_DATA.find((s) => s.name === state.species);
  const selectedSubclass = selectedClass?.subclasses.find((sc) => sc.name === state.subclass);

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
            {SPECIES_DATA.map((s) => (
              <SelectItem key={s.name} value={s.name}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedSpecies ? (
          <p className="text-xs text-muted-foreground italic">{selectedSpecies.description}</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            2024 rules: species grant no ability score increases
          </p>
        )}
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
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">
              Hit die: d{selectedClass.hitDie} · {selectedClass.skillCount} skill proficiencies
            </p>
            <p className="text-xs text-muted-foreground italic">{selectedClass.description}</p>
          </div>
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
                <SelectItem key={sc.name} value={sc.name}>
                  {sc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedSubclass && (
            <p className="text-xs text-muted-foreground italic">{selectedSubclass.description}</p>
          )}
        </div>
      )}

      <Button className="w-full" disabled={!isValid} onClick={onNext}>
        Next: Background
      </Button>
    </div>
  );
}
