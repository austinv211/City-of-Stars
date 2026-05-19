import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card";
import { Badge } from "@/core/components/ui/badge";
import type { AbilityScores, CharacterProficiency } from "../types/character.types";
import { abilityModifier } from "../types/character.types";

const SKILLS: { name: string; ability: keyof AbilityScores }[] = [
  { name: "Acrobatics",      ability: "dexterity" },
  { name: "Animal Handling", ability: "wisdom" },
  { name: "Arcana",          ability: "intelligence" },
  { name: "Athletics",       ability: "strength" },
  { name: "Deception",       ability: "charisma" },
  { name: "History",         ability: "intelligence" },
  { name: "Insight",         ability: "wisdom" },
  { name: "Intimidation",    ability: "charisma" },
  { name: "Investigation",   ability: "intelligence" },
  { name: "Medicine",        ability: "wisdom" },
  { name: "Nature",          ability: "intelligence" },
  { name: "Perception",      ability: "wisdom" },
  { name: "Performance",     ability: "charisma" },
  { name: "Persuasion",      ability: "charisma" },
  { name: "Religion",        ability: "intelligence" },
  { name: "Sleight of Hand", ability: "dexterity" },
  { name: "Stealth",         ability: "dexterity" },
  { name: "Survival",        ability: "wisdom" },
];

const ABILITY_ABBR: Record<keyof AbilityScores, string> = {
  strength: "STR",
  dexterity: "DEX",
  constitution: "CON",
  intelligence: "INT",
  wisdom: "WIS",
  charisma: "CHA",
};

interface Props {
  finalScores: AbilityScores;
  proficiencies: CharacterProficiency[];
  proficiencyBonus: number;
}

export function SkillsPanel({ finalScores, proficiencies, proficiencyBonus }: Props) {
  const sign = (n: number) => (n >= 0 ? `+${n}` : String(n));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Skills
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
          {SKILLS.map(({ name, ability }) => {
            const abilityMod = abilityModifier(finalScores[ability]);
            const prof = proficiencies.find((p) => p.skill === name);
            const bonus = prof
              ? prof.is_expertise
                ? proficiencyBonus * 2
                : proficiencyBonus
              : 0;
            const total = abilityMod + bonus;

            return (
              <div
                key={name}
                className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-muted/40"
              >
                {/* Proficiency indicator */}
                <div
                  className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                    prof
                      ? prof.is_expertise
                        ? "bg-yellow-400"
                        : "bg-primary"
                      : "border border-muted-foreground/40"
                  }`}
                  title={prof ? (prof.is_expertise ? "Expertise" : "Proficient") : "Not proficient"}
                />

                {/* Modifier badge */}
                <Badge
                  variant={prof ? "default" : "outline"}
                  className="text-xs w-10 justify-center shrink-0"
                >
                  {sign(total)}
                </Badge>

                {/* Skill name */}
                <span className="text-xs flex-1 min-w-0 truncate">{name}</span>

                {/* Ability abbreviation */}
                <span className="text-xs text-muted-foreground shrink-0">
                  ({ABILITY_ABBR[ability]})
                </span>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          ● Proficient{" · "}● Expert (yellow){" · "}○ None
        </p>
      </CardContent>
    </Card>
  );
}
