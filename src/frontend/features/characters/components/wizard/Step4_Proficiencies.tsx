import { Button } from "@/core/components/ui/button";
import { Checkbox } from "@/core/components/ui/checkbox";
import { Label } from "@/core/components/ui/label";
import { Badge } from "@/core/components/ui/badge";
import { Separator } from "@/core/components/ui/separator";
import { CLASSES, SKILLS } from "../../data/dnd2024.constants";
import type { WizardState, WizardAction } from "../../types/character.types";

interface Props {
  state: WizardState;
  dispatch: React.Dispatch<WizardAction>;
  onNext: () => void;
}

export function Step4_Proficiencies({ state, dispatch, onNext }: Props) {
  const classData = CLASSES.find((c) => c.name === state.characterClass);
  const skillCount = classData?.skillCount ?? 2;
  const skillChoices = new Set(classData?.skillChoices ?? []);
  const savingThrows = classData?.savingThrows ?? [];
  const selected = state.skillProficiencies;

  const isComplete = selected.length === skillCount;

  function toggle(skillName: string) {
    dispatch({ type: "TOGGLE_SKILL", skill: skillName, max: skillCount });
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold">Skill Proficiencies</h3>
            <p className="text-xs text-muted-foreground">
              Choose {skillCount} from your class list
            </p>
          </div>
          <Badge variant={isComplete ? "default" : "secondary"}>
            {selected.length} / {skillCount}
          </Badge>
        </div>

        <div className="space-y-2">
          {SKILLS.map((skill) => {
            const available = skillChoices.has(skill.name);
            const checked = selected.includes(skill.name);
            const disabled = !available || (!checked && selected.length >= skillCount);

            return (
              <div
                key={skill.name}
                className={`flex items-center gap-3 rounded-md px-3 py-2 ${
                  available ? "hover:bg-muted/50" : "opacity-40"
                }`}
              >
                <Checkbox
                  id={`skill-${skill.name}`}
                  checked={checked}
                  disabled={disabled}
                  onCheckedChange={() => toggle(skill.name)}
                />
                <Label
                  htmlFor={`skill-${skill.name}`}
                  className={`flex-1 cursor-pointer ${disabled && !checked ? "cursor-default" : ""}`}
                >
                  {skill.name}
                </Label>
                <span className="text-xs text-muted-foreground font-mono uppercase">
                  {skill.ability.slice(0, 3)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="text-sm font-semibold mb-3">Saving Throw Proficiencies</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Granted by your class — cannot be changed
        </p>
        <div className="flex flex-wrap gap-2">
          {savingThrows.map((ability) => (
            <Badge key={ability} variant="outline" className="capitalize">
              {ability}
            </Badge>
          ))}
        </div>
      </div>

      <Button className="w-full" disabled={!isComplete} onClick={onNext}>
        Next: Portrait
      </Button>
    </div>
  );
}
