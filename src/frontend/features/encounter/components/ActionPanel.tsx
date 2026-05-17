import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card";
import { Separator } from "@/core/components/ui/separator";
import { DiceRollButton } from "./DiceRollButton";
import { abilityModifier } from "@/features/characters/types/character.types";
import type { EncounterParticipant } from "../types/encounter.types";
import type { CharacterWithScores } from "@/features/characters/types/character.types";

interface Props {
  participant: EncounterParticipant;
  character: CharacterWithScores | null;
  campaignId: string;
  encounterId: string;
}

export function ActionPanel({ participant, character, campaignId, encounterId }: Props) {
  const scores = character?.ability_scores;

  const commonOpts = {
    campaignId,
    encounterId,
    characterName: participant.name,
  };

  const strMod = scores ? abilityModifier(scores.strength) : 0;
  const dexMod = scores ? abilityModifier(scores.dexterity) : 0;
  const wisMod = scores ? abilityModifier(scores.wisdom) : 0;
  const intMod = scores ? abilityModifier(scores.intelligence) : 0;
  const chaMod = scores ? abilityModifier(scores.charisma) : 0;
  const conMod = scores ? abilityModifier(scores.constitution) : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {participant.name} — Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2">Attack</p>
          <div className="flex flex-wrap gap-2">
            <DiceRollButton
              label={`Attack d20${strMod >= 0 ? "+" : ""}${strMod}`}
              options={{ ...commonOpts, diceType: "d20", sides: 20, modifier: strMod, rollType: "Attack (STR)" }}
            />
            <DiceRollButton
              label={`Attack d20${dexMod >= 0 ? "+" : ""}${dexMod}`}
              options={{ ...commonOpts, diceType: "d20", sides: 20, modifier: dexMod, rollType: "Attack (DEX)" }}
            />
          </div>
        </div>

        <Separator />

        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2">Saving Throws</p>
          <div className="flex flex-wrap gap-2">
            {[
              { label: "STR", mod: strMod, rollType: "STR Save" },
              { label: "DEX", mod: dexMod, rollType: "DEX Save" },
              { label: "CON", mod: conMod, rollType: "CON Save" },
              { label: "INT", mod: intMod, rollType: "INT Save" },
              { label: "WIS", mod: wisMod, rollType: "WIS Save" },
              { label: "CHA", mod: chaMod, rollType: "CHA Save" },
            ].map(({ label, mod, rollType }) => (
              <DiceRollButton
                key={rollType}
                label={`${label} ${mod >= 0 ? "+" : ""}${mod}`}
                options={{ ...commonOpts, diceType: "d20", sides: 20, modifier: mod, rollType }}
                variant="secondary"
              />
            ))}
          </div>
        </div>

        <Separator />

        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2">Skill Checks</p>
          <div className="flex flex-wrap gap-2">
            {character?.proficiencies
              .filter((p) => p.proficiency_type === "skill")
              .map((prof) => (
                <DiceRollButton
                  key={prof.id}
                  label={prof.name}
                  options={{
                    ...commonOpts,
                    diceType: "d20",
                    sides: 20,
                    modifier: 0,
                    rollType: `${prof.name} Check`,
                  }}
                  variant="outline"
                />
              ))}
          </div>
        </div>

        <Separator />

        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2">Damage Dice</p>
          <div className="flex flex-wrap gap-2">
            {[
              { label: "d4", sides: 4 },
              { label: "d6", sides: 6 },
              { label: "d8", sides: 8 },
              { label: "d10", sides: 10 },
              { label: "d12", sides: 12 },
            ].map(({ label, sides }) => (
              <DiceRollButton
                key={label}
                label={label}
                options={{ ...commonOpts, diceType: label, sides, modifier: 0, rollType: "Damage" }}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
