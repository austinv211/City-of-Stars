import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card";
import { Badge } from "@/core/components/ui/badge";
import { Button } from "@/core/components/ui/button";
import { Separator } from "@/core/components/ui/separator";
import { useDice } from "../context/DiceContext";
import { abilityModifier, finalAbilityScores, deriveStats } from "@/features/characters/types/character.types";
import { CLASSES } from "@/features/characters/data/dnd2024.constants";
import type { EncounterParticipant } from "../types/encounter.types";
import type { CharacterWithScores, CharacterAttack, AbilityName } from "@/features/characters/types/character.types";

const DICE_SIZES = [4, 6, 8, 10, 12, 20, 100] as const;

const SKILL_ABILITY: Record<string, AbilityName> = {
  "Acrobatics":      "dexterity",
  "Animal Handling": "wisdom",
  "Arcana":          "intelligence",
  "Athletics":       "strength",
  "Deception":       "charisma",
  "History":         "intelligence",
  "Insight":         "wisdom",
  "Intimidation":    "charisma",
  "Investigation":   "intelligence",
  "Medicine":        "wisdom",
  "Nature":          "intelligence",
  "Perception":      "wisdom",
  "Performance":     "charisma",
  "Persuasion":      "charisma",
  "Religion":        "intelligence",
  "Sleight of Hand": "dexterity",
  "Stealth":         "dexterity",
  "Survival":        "wisdom",
};

interface Props {
  participant: EncounterParticipant;
  character: CharacterWithScores | null;
  attacks: CharacterAttack[];
  campaignId: string;
  encounterId: string;
  isMyTurn: boolean;
  isDM: boolean;
}

export function ActionPanel({
  participant, character, attacks, campaignId, encounterId, isMyTurn, isDM,
}: Props) {
  const { roll } = useDice();

  // --- Ability scores & derived stats ---
  // For player participants, use the character sheet final scores.
  // For NPCs, fall back to participant-level scores (from monster library).
  let strScore = participant.str_score ?? 10;
  let dexScore = participant.dex_score ?? 10;
  let conScore = participant.con_score ?? 10;
  let intScore = participant.int_score ?? 10;
  let wisScore = participant.wis_score ?? 10;
  let chaScore = participant.cha_score ?? 10;
  let profBonus = 2;
  let savingThrowProfs: AbilityName[] = [];

  if (participant.is_player && character?.ability_scores) {
    const base = character.ability_scores;
    const final = finalAbilityScores(
      base,
      base.background_bonus_primary,
      base.background_bonus_secondary,
    );
    strScore = final.strength;
    dexScore = final.dexterity;
    conScore = final.constitution;
    intScore = final.intelligence;
    wisScore = final.wisdom;
    chaScore = final.charisma;
    profBonus = deriveStats(final, character.level).proficiencyBonus;
    savingThrowProfs =
      CLASSES.find((c) => c.name === character.class)?.savingThrows ?? [];
  }

  const mods = {
    strength:     abilityModifier(strScore),
    dexterity:    abilityModifier(dexScore),
    constitution: abilityModifier(conScore),
    intelligence: abilityModifier(intScore),
    wisdom:       abilityModifier(wisScore),
    charisma:     abilityModifier(chaScore),
  };

  const sign = (n: number) => (n >= 0 ? `+${n}` : String(n));
  const locked = participant.is_player && !isMyTurn && !isDM;
  const base = { campaignId, encounterId, characterName: participant.name };

  function doRoll(diceType: string, sides: number, modifier: number, rollType: string) {
    roll({ ...base, diceType, sides, modifier, rollType });
  }

  const monsterActions = participant.actions ?? [];

  // Skill check modifiers — proficiency + ability mod for this character
  const skillMod = (skill: string) => {
    const ability = SKILL_ABILITY[skill] ?? "strength";
    const abilityMod = mods[ability];
    if (!participant.is_player) return abilityMod;
    const prof = character?.proficiencies.find((p) => p.skill === skill);
    if (!prof) return abilityMod;
    return prof.is_expertise
      ? abilityMod + profBonus * 2
      : abilityMod + profBonus;
  };

  const saveMod = (ability: AbilityName) => {
    const base = mods[ability];
    if (!participant.is_player) return base;
    return savingThrowProfs.includes(ability) ? base + profBonus : base;
  };

  return (
    <Card className={isMyTurn ? "border-primary ring-1 ring-primary" : undefined}>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {participant.name}
          </CardTitle>
          {isMyTurn && <Badge variant="default">Your Turn</Badge>}
          {!participant.is_player && <Badge variant="secondary" className="text-xs">NPC</Badge>}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">

        {/* ── Dice Tray ────────────────────────────────────────────────────────── */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2">Dice Tray</p>
          <div className="flex flex-wrap gap-1.5">
            {DICE_SIZES.map((sides) => (
              <Button
                key={sides}
                size="sm"
                variant="outline"
                className="h-8 px-3 font-bold text-xs"
                onClick={() => doRoll(`d${sides}`, sides, 0, `d${sides} Roll`)}
              >
                d{sides}
              </Button>
            ))}
          </div>
        </div>

        <Separator />

        {/* ── Monster Actions (from stat block) ───────────────────────────────── */}
        {monsterActions.length > 0 && (
          <>
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">Actions</p>
              <div className="space-y-2">
                {monsterActions.map((action, i) => (
                  <div key={i} className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-muted-foreground flex-1 min-w-0 truncate" title={action.desc}>
                      {action.name}
                    </span>
                    {action.attack_bonus != null && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs shrink-0"
                        disabled={locked}
                        onClick={() => doRoll("d20", 20, action.attack_bonus!, `${action.name} Attack`)}
                      >
                        Hit {sign(action.attack_bonus)}
                      </Button>
                    )}
                    {action.damage_dice && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs shrink-0"
                        disabled={locked}
                        onClick={() => {
                          const [countStr, rest] = action.damage_dice!.split("d");
                          const [sidesStr, modStr] = (rest ?? "6").split(/[+-]/);
                          const sides = parseInt(sidesStr) || 6;
                          const count = parseInt(countStr) || 1;
                          const mod = action.damage_dice!.includes("+")
                            ? parseInt(modStr) || 0
                            : action.damage_dice!.includes("-")
                              ? -(parseInt(modStr) || 0)
                              : 0;
                          // Roll count dice summed — simplified as 1 roll with avg extra
                          doRoll(`d${sides}`, sides, mod + (count - 1) * Math.ceil(sides / 2), `${action.name} Dmg`);
                        }}
                      >
                        {action.damage_dice} {action.damage_type ?? ""}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <Separator />
          </>
        )}

        {/* ── Character Attacks ────────────────────────────────────────────────── */}
        {attacks.length > 0 && (
          <>
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">
                Attacks
                {locked && <span className="ml-2 text-xs font-normal italic">(wait for your turn)</span>}
              </p>
              <div className="flex flex-wrap gap-2">
                {attacks.map((atk) => (
                  <div key={atk.id} className="flex flex-col gap-1">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-7 text-xs font-medium"
                      disabled={locked}
                      onClick={() => doRoll("d20", 20, atk.attack_modifier, `${atk.name} Attack`)}
                    >
                      {atk.name} {sign(atk.attack_modifier)}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      disabled={locked}
                      onClick={() => doRoll(`d${atk.dice_sides}`, atk.dice_sides, atk.damage_modifier, `${atk.name} Dmg`)}
                    >
                      {atk.dice_count}d{atk.dice_sides}{sign(atk.damage_modifier)}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
            <Separator />
          </>
        )}

        {/* ── Saving Throws ────────────────────────────────────────────────────── */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2">Saving Throws</p>
          <div className="flex flex-wrap gap-1.5">
            {(["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"] as AbilityName[]).map(
              (ability) => {
                const mod = saveMod(ability);
                const isProficient = savingThrowProfs.includes(ability);
                const label = ability.slice(0, 3).toUpperCase();
                return (
                  <Button
                    key={ability}
                    size="sm"
                    variant={isProficient ? "secondary" : "outline"}
                    className="h-8 text-xs"
                    disabled={locked}
                    onClick={() => doRoll("d20", 20, mod, `${label} Save`)}
                    title={isProficient ? "Proficient" : undefined}
                  >
                    {label} {sign(mod)}{isProficient ? " ★" : ""}
                  </Button>
                );
              }
            )}
          </div>
        </div>

        <Separator />

        {/* ── Skill Checks ────────────────────────────────────────────────────── */}
        {participant.is_player && character && character.proficiencies.length > 0 && (
          <>
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">Skill Checks</p>
              <div className="flex flex-wrap gap-1.5">
                {character.proficiencies.map((prof) => {
                  const mod = skillMod(prof.skill);
                  return (
                    <Button
                      key={prof.id}
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      disabled={locked}
                      onClick={() => doRoll("d20", 20, mod, `${prof.skill} Check`)}
                    >
                      {prof.skill} {sign(mod)}{prof.is_expertise ? " ★★" : " ★"}
                    </Button>
                  );
                })}
              </div>
            </div>
            <Separator />
          </>
        )}

        {/* ── Ability Checks ──────────────────────────────────────────────────── */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2">Ability Checks</p>
          <div className="flex flex-wrap gap-1.5">
            {(["STR", "DEX", "CON", "INT", "WIS", "CHA"] as const).map((label, i) => {
              const ability = (["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"] as AbilityName[])[i];
              const mod = mods[ability];
              return (
                <Button
                  key={label}
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs"
                  disabled={locked}
                  onClick={() => doRoll("d20", 20, mod, `${label} Check`)}
                >
                  {label} {sign(mod)}
                </Button>
              );
            })}
          </div>
        </div>

      </CardContent>
    </Card>
  );
}
