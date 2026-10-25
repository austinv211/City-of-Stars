import { Button } from "@/core/components/ui/button";
import { Separator } from "@/core/components/ui/separator";
import { coverAcBonus } from "@/features/characters/data/rules2024";
import { ABILITIES, sign } from "./combatantStats";
import type { CombatantView } from "./combatantView";

const short = (ability: string) => ability.slice(0, 3).toUpperCase();

/** Saving throws, with proficiency, cover (DEX) and condition effects applied. */
export function SaveRow({ view }: { view: CombatantView }) {
  const { participant, rolls, stats, locked } = view;
  const { condEffects } = stats;
  return (
    <div>
      <p className="mb-2 text-xs font-semibold text-muted-foreground">Saving Throws</p>
      <div className="flex flex-wrap gap-1.5">
        {ABILITIES.map((ability) => {
          const isDex = ability === "dexterity";
          // Cover grants its AC bonus to DEX saves too (2024).
          const coverBonus = isDex ? coverAcBonus(participant.cover) : 0;
          const mod = stats.saveMod(ability) + stats.exhaustPenalty + coverBonus;
          const isProficient = stats.savingThrowProfs.includes(ability);
          const label = short(ability);
          const dexDis = isDex && condEffects.dexSaveDisadvantage;
          const autoFail =
            condEffects.autoFailStrDexSaves && (ability === "strength" || isDex);
          return (
            <Button
              key={ability}
              size="sm"
              variant={isProficient ? "secondary" : "outline"}
              className="h-8 text-xs"
              disabled={locked}
              onClick={() =>
                void rolls.rollD20(mod, `${label} Save`, { disadvantage: dexDis })
              }
              title={
                autoFail
                  ? "Automatically fails due to a condition"
                  : isProficient
                    ? "Proficient"
                    : undefined
              }
            >
              {label} {sign(mod)}
              {isProficient ? " ★" : ""}
              {autoFail && <span className="ml-1 text-destructive">auto-fail</span>}
              {dexDis && !autoFail && (
                <span className="ml-1 text-destructive">dis</span>
              )}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

/** Skill checks for the skills the character is proficient in. */
export function SkillRow({ view }: { view: CombatantView }) {
  const { participant, character, rolls, stats, locked } = view;
  if (!participant.is_player || !character || character.proficiencies.length === 0)
    return null;
  const dis = stats.condEffects.abilityCheckDisadvantage;
  return (
    <>
      <div>
        <p className="mb-2 text-xs font-semibold text-muted-foreground">Skill Checks</p>
        <div className="flex flex-wrap gap-1.5">
          {character.proficiencies.map((prof) => {
            const mod = stats.skillMod(prof.skill) + stats.exhaustPenalty;
            return (
              <Button
                key={prof.id}
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                disabled={locked}
                onClick={() =>
                  void rolls.rollD20(mod, `${prof.skill} Check`, { disadvantage: dis })
                }
              >
                {prof.skill} {sign(mod)}
                {prof.is_expertise ? " ★★" : " ★"}
                {dis && <span className="ml-1 text-destructive">dis</span>}
              </Button>
            );
          })}
        </div>
      </div>
      <Separator />
    </>
  );
}

/** Raw ability checks, with Jack of All Trades where it applies. */
export function AbilityCheckRow({ view }: { view: CombatantView }) {
  const { rolls, stats, locked } = view;
  const dis = stats.condEffects.abilityCheckDisadvantage;
  return (
    <div>
      <p className="mb-2 text-xs font-semibold text-muted-foreground">Ability Checks</p>
      <div className="flex flex-wrap gap-1.5">
        {ABILITIES.map((ability) => {
          const label = short(ability);
          const mod = stats.mods[ability] + stats.exhaustPenalty + stats.joatBonus;
          return (
            <Button
              key={ability}
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              disabled={locked}
              onClick={() =>
                void rolls.rollD20(mod, `${label} Check`, { disadvantage: dis })
              }
            >
              {label} {sign(mod)}
              {dis && <span className="ml-1 text-destructive">dis</span>}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
