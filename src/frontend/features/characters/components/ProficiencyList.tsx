import { Badge } from "@/core/components/ui/badge";
import { Separator } from "@/core/components/ui/separator";
import type { CharacterProficiency } from "../types/character.types";

interface Props {
  proficiencies: CharacterProficiency[];
  savingThrows: string[];
}

export function ProficiencyList({ proficiencies, savingThrows }: Props) {
  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
          Skills
        </h4>
        <div className="flex flex-wrap gap-1.5">
          {proficiencies.map((p) => (
            <Badge key={p.id} variant={p.is_expertise ? "default" : "secondary"}>
              {p.skill}
              {p.is_expertise && " ★"}
            </Badge>
          ))}
          {proficiencies.length === 0 && (
            <span className="text-xs text-muted-foreground">None</span>
          )}
        </div>
      </div>

      <Separator />

      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
          Saving Throws
        </h4>
        <div className="flex flex-wrap gap-1.5">
          {savingThrows.map((ability) => (
            <Badge key={ability} variant="outline" className="capitalize">
              {ability}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}
