import { abilityModifier } from "../types/character.types";
import type { AbilityScores } from "../types/character.types";

const ABILITIES = [
  { key: "strength", label: "STR" },
  { key: "dexterity", label: "DEX" },
  { key: "constitution", label: "CON" },
  { key: "intelligence", label: "INT" },
  { key: "wisdom", label: "WIS" },
  { key: "charisma", label: "CHA" },
] as const;

interface Props {
  scores: AbilityScores;
}

export function AbilityScoreBlock({ scores }: Props) {
  return (
    <div className="grid grid-cols-6 gap-2 text-center">
      {ABILITIES.map(({ key, label }) => {
        const score = scores[key];
        const m = abilityModifier(score);
        return (
          <div key={key} className="rounded-lg border bg-card p-2">
            <div className="text-xs font-semibold text-muted-foreground">{label}</div>
            <div className="text-2xl font-bold mt-1">{score}</div>
            <div className="text-xs text-muted-foreground font-mono">
              {m >= 0 ? `+${m}` : m}
            </div>
          </div>
        );
      })}
    </div>
  );
}
