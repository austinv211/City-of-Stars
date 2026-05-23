import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card";
import { Badge } from "@/core/components/ui/badge";
import { supabase } from "@/lib/supabase";
import type { AbilityScores, CharacterProficiency } from "../types/character.types";
import { skillBonus } from "../types/character.types";

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
  halfProficiency?: boolean;
  canEdit?: boolean;
  characterId?: string;
  onRefresh?: () => void;
}

export function SkillsPanel({ finalScores, proficiencies, proficiencyBonus, halfProficiency = false, canEdit = false, characterId, onRefresh }: Props) {
  const sign = (n: number) => (n >= 0 ? `+${n}` : String(n));
  const [busy, setBusy] = useState<string | null>(null);

  async function cycleSkill(skillName: string) {
    if (!canEdit || !characterId || busy) return;
    setBusy(skillName);
    const prof = proficiencies.find((p) => p.skill === skillName);
    if (!prof) {
      await supabase.from("character_proficiencies").insert({ character_id: characterId, skill: skillName, is_expertise: false, source: "class" });
    } else if (!prof.is_expertise) {
      await supabase.from("character_proficiencies").update({ is_expertise: true }).eq("id", prof.id);
    } else {
      await supabase.from("character_proficiencies").delete().eq("id", prof.id);
    }
    setBusy(null);
    onRefresh?.();
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Skills
          {canEdit && <span className="ml-2 normal-case font-normal text-muted-foreground/70">· click dot to toggle</span>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
          {SKILLS.map(({ name, ability }) => {
            const prof = proficiencies.find((p) => p.skill === name);
            const total = skillBonus(finalScores, proficiencyBonus, name, proficiencies, halfProficiency);
            const isBusy = busy === name;

            return (
              <div
                key={name}
                className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-muted/40"
              >
                <button
                  type="button"
                  disabled={!canEdit || isBusy}
                  onClick={() => cycleSkill(name)}
                  className={`h-2.5 w-2.5 rounded-full shrink-0 transition-opacity ${
                    canEdit ? "cursor-pointer hover:opacity-70" : "cursor-default"
                  } ${isBusy ? "opacity-40" : ""} ${
                    prof
                      ? prof.is_expertise
                        ? "bg-yellow-400"
                        : "bg-primary"
                      : "border border-muted-foreground/40"
                  }`}
                  title={
                    canEdit
                      ? prof
                        ? prof.is_expertise
                          ? "Click to remove proficiency"
                          : "Click for expertise"
                        : "Click to add proficiency"
                      : prof
                        ? prof.is_expertise ? "Expertise" : "Proficient"
                        : "Not proficient"
                  }
                />

                <Badge
                  variant={prof ? "default" : "outline"}
                  className="text-xs w-10 justify-center shrink-0"
                >
                  {sign(total)}
                </Badge>

                <span className="text-xs flex-1 min-w-0 truncate">{name}</span>

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
