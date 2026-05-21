import { useState, useEffect } from "react";
import { Badge } from "@/core/components/ui/badge";
import { Button } from "@/core/components/ui/button";
import { Separator } from "@/core/components/ui/separator";
import { ScrollArea } from "@/core/components/ui/scroll-area";
import { useDice } from "../context/DiceContext";
import { DicePoolBuilder } from "./DicePoolBuilder";
import {
  abilityModifier,
  finalAbilityScores,
  deriveStats,
} from "@/features/characters/types/character.types";
import { CLASSES } from "@/features/characters/data/dnd2024.constants";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import type {
  EncounterParticipant,
  ActionCategory,
} from "../types/encounter.types";
import type {
  CharacterWithScores,
  CharacterAttack,
  CharacterSpell,
  AbilityName,
} from "@/features/characters/types/character.types";

// ── Action economy data ────────────────────────────────────────────────────

interface ActionEntry {
  id: string;
  label: string;
}

const STANDARD_ACTIONS: ActionEntry[] = [
  { id: "attack", label: "Attack" },
  { id: "cast", label: "Cast a Spell" },
  { id: "dash", label: "Dash" },
  { id: "disengage", label: "Disengage" },
  { id: "dodge", label: "Dodge" },
  { id: "help", label: "Help" },
  { id: "hide", label: "Hide" },
  { id: "ready", label: "Ready" },
  { id: "search", label: "Search" },
  { id: "use_object", label: "Use Object" },
];

const CLASS_BONUS_ACTIONS: Record<string, ActionEntry[]> = {
  Barbarian: [
    { id: "rage", label: "Rage" },
    { id: "reckless_attack", label: "Reckless Attack" },
  ],
  Bard: [
    { id: "bardic_inspiration", label: "Bardic Inspiration" },
    { id: "healing_word", label: "Healing Word" },
  ],
  Cleric: [
    { id: "healing_word", label: "Healing Word" },
    { id: "spiritual_weapon", label: "Spiritual Weapon" },
  ],
  Druid: [
    { id: "wild_shape", label: "Wild Shape" },
    { id: "healing_word", label: "Healing Word" },
  ],
  Fighter: [
    { id: "second_wind", label: "Second Wind" },
    { id: "action_surge", label: "Action Surge" },
    { id: "two_weapon", label: "Two-Weapon Attack" },
  ],
  Monk: [
    { id: "flurry", label: "Flurry of Blows (1 Ki)" },
    { id: "patient_defense", label: "Patient Defense (1 Ki)" },
    { id: "step_wind", label: "Step of the Wind (1 Ki)" },
  ],
  Paladin: [
    { id: "divine_smite", label: "Divine Smite" },
    { id: "lay_on_hands", label: "Lay on Hands" },
  ],
  Ranger: [
    { id: "hunters_mark", label: "Hunter's Mark" },
    { id: "two_weapon", label: "Two-Weapon Attack" },
  ],
  Rogue: [
    { id: "cunning_action", label: "Cunning Action" },
    { id: "two_weapon", label: "Two-Weapon Attack" },
  ],
  Sorcerer: [
    { id: "quickened_spell", label: "Quickened Spell (2 SP)" },
    { id: "twinned_spell", label: "Twinned Spell" },
  ],
  Warlock: [{ id: "two_weapon", label: "Two-Weapon Attack" }],
  Wizard: [{ id: "two_weapon", label: "Two-Weapon Attack" }],
};

const CLASS_REACTIONS: Record<string, ActionEntry[]> = {
  Barbarian: [],
  Bard: [{ id: "cutting_words", label: "Cutting Words" }],
  Cleric: [],
  Druid: [],
  Fighter: [],
  Monk: [{ id: "deflect_missiles", label: "Deflect Missiles" }],
  Paladin: [
    { id: "divine_smite_reaction", label: "Smite (Reaction)" },
    { id: "aura_protection", label: "Aura of Protection" },
  ],
  Ranger: [],
  Rogue: [{ id: "uncanny_dodge", label: "Uncanny Dodge" }],
  Sorcerer: [],
  Warlock: [],
  Wizard: [
    { id: "shield", label: "Shield" },
    { id: "counterspell", label: "Counterspell" },
  ],
};

const UNIVERSAL_REACTIONS: ActionEntry[] = [
  { id: "opportunity_attack", label: "Opportunity Attack" },
];

// ── Action slot label styles ───────────────────────────────────────────────

const SLOT_BADGE: Record<ActionCategory, string> = {
  action: "bg-primary/15 text-primary",
  bonus: "bg-secondary/20 text-secondary",
  reaction: "bg-accent/60 text-accent-foreground",
  free: "bg-muted/20 text-muted-foreground",
};

const SLOT_BTN: Record<ActionCategory, string> = {
  action: "bg-primary/10 text-primary hover:bg-primary/20 border-0",
  bonus: "bg-secondary/15 text-secondary hover:bg-secondary/25 border-0",
  reaction: "bg-accent/40 text-accent-foreground hover:bg-accent/60 border-0",
  free: "bg-muted/20 text-muted-foreground hover:bg-muted/40 border-0",
};

// Attack/cast highlighted differently; everything else uses slot color
const ACTION_BTN_OVERRIDES: Record<string, string> = {
  attack: "bg-destructive/10 text-destructive hover:bg-destructive/20 border-0",
  cast: "bg-primary/15 text-primary hover:bg-primary/25 border-0",
};

const SKILL_ABILITY: Record<string, AbilityName> = {
  Acrobatics: "dexterity",
  "Animal Handling": "wisdom",
  Arcana: "intelligence",
  Athletics: "strength",
  Deception: "charisma",
  History: "intelligence",
  Insight: "wisdom",
  Intimidation: "charisma",
  Investigation: "intelligence",
  Medicine: "wisdom",
  Nature: "intelligence",
  Perception: "wisdom",
  Performance: "charisma",
  Persuasion: "charisma",
  Religion: "intelligence",
  "Sleight of Hand": "dexterity",
  Stealth: "dexterity",
  Survival: "wisdom",
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
  participant,
  character,
  attacks,
  campaignId,
  encounterId,
  isMyTurn,
  isDM,
}: Props) {
  const { roll, rollPool, announceAction } = useDice();
  const [damageSpells, setDamageSpells] = useState<CharacterSpell[]>([]);

  useEffect(() => {
    if (!participant.character_id) {
      setDamageSpells([]);
      return;
    }
    supabase
      .from("character_spells")
      .select("*")
      .eq("character_id", participant.character_id)
      .not("damage_dice", "is", null)
      .then(({ data }) => setDamageSpells((data as CharacterSpell[]) ?? []));
  }, [participant.character_id]);

  // Players see only name/portrait/size for NPCs — no stat block or roll controls
  if (!isDM && !participant.is_player) {
    return (
      <div>
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <span className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {participant.name}
          </span>
          <Badge variant="secondary" className="text-xs">
            NPC
          </Badge>
        </div>
        {participant.portrait_url && (
          <img
            src={participant.portrait_url}
            alt={participant.name}
            className="w-24 h-24 object-cover mb-3"
          />
        )}
        <p className="text-xs text-muted-foreground italic">
          Stat block hidden from players.
        </p>
      </div>
    );
  }

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
    strength: abilityModifier(strScore),
    dexterity: abilityModifier(dexScore),
    constitution: abilityModifier(conScore),
    intelligence: abilityModifier(intScore),
    wisdom: abilityModifier(wisScore),
    charisma: abilityModifier(chaScore),
  };

  const sign = (n: number) => (n >= 0 ? `+${n}` : String(n));
  const locked = participant.is_player && !isMyTurn && !isDM;
  const base = { campaignId, encounterId, characterName: participant.name };

  function doRoll(diceType: string, sides: number, modifier: number, rollType: string) {
    roll({ ...base, diceType, sides, modifier, rollType });
  }

  function useAction(label: string, category: ActionCategory) {
    announceAction({
      campaignId,
      encounterId,
      characterName: participant.name,
      actionText: label,
      actionCategory: category,
    });
  }

  const charClass = character?.class ?? "";
  const classBonusActions = CLASS_BONUS_ACTIONS[charClass] ?? [];
  const classReactions = CLASS_REACTIONS[charClass] ?? [];
  const reactions = [...UNIVERSAL_REACTIONS, ...classReactions];
  const monsterActions = participant.actions ?? [];

  const skillMod = (skill: string) => {
    const ability = SKILL_ABILITY[skill] ?? "strength";
    const abilityMod = mods[ability];
    if (!participant.is_player) return abilityMod;
    const prof = character?.proficiencies.find((p) => p.skill === skill);
    if (!prof) return abilityMod;
    return prof.is_expertise ? abilityMod + profBonus * 2 : abilityMod + profBonus;
  };

  const saveMod = (ability: AbilityName) => {
    const base = mods[ability];
    if (!participant.is_player) return base;
    return savingThrowProfs.includes(ability) ? base + profBonus : base;
  };

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 pr-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {participant.name}
          </span>
          {isMyTurn && (
            <Badge className="bg-success/20 text-success border-success/50 animate-pulse">
              Your Turn
            </Badge>
          )}
          {!participant.is_player && (
            <Badge variant="secondary" className="text-xs">
              NPC
            </Badge>
          )}
        </div>

        {/* ── Action Economy ──────────────────────────────────────────────────── */}
        {participant.is_player && (
          <>
            <div className="space-y-2">
              {/* Action slot */}
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className={cn("text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5", SLOT_BADGE.action)}>
                    Action
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {STANDARD_ACTIONS.map((a) => (
                    <Button
                      key={a.id}
                      size="sm"
                      variant="ghost"
                      disabled={locked}
                      onClick={() => useAction(a.label, "action")}
                      className={cn(
                        "h-7 text-xs px-2",
                        ACTION_BTN_OVERRIDES[a.id] ?? SLOT_BTN.action,
                        locked && "opacity-50",
                      )}
                    >
                      {a.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Bonus action slot */}
              {classBonusActions.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className={cn("text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5", SLOT_BADGE.bonus)}>
                      Bonus
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {classBonusActions.map((a) => (
                      <Button
                        key={a.id}
                        size="sm"
                        variant="ghost"
                        disabled={locked}
                        onClick={() => useAction(a.label, "bonus")}
                        className={cn("h-7 text-xs px-2", SLOT_BTN.bonus, locked && "opacity-50")}
                      >
                        {a.label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Reaction slot */}
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className={cn("text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5", SLOT_BADGE.reaction)}>
                    Reaction
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {reactions.map((a) => (
                    <Button
                      key={a.id}
                      size="sm"
                      variant="ghost"
                      disabled={locked}
                      onClick={() => useAction(a.label, "reaction")}
                      className={cn("h-7 text-xs px-2", SLOT_BTN.reaction, locked && "opacity-50")}
                    >
                      {a.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
            <Separator />
          </>
        )}

        {/* ── Dice Pool Builder ───────────────────────────────────────────────── */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2">Dice Pool</p>
          <DicePoolBuilder
            disabled={locked}
            onRoll={({ pool, modifier, advantage, disadvantage, rollType }) =>
              rollPool({
                campaignId,
                encounterId,
                characterName: participant.name,
                pool,
                modifier,
                advantage,
                disadvantage,
                rollType,
              })
            }
          />
        </div>

        <Separator />

        {/* ── Monster Actions ─────────────────────────────────────────────────── */}
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

        {/* ── Attacks & Damage Spells ─────────────────────────────────────────── */}
        {(attacks.length > 0 || damageSpells.length > 0) && (
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
                {damageSpells.map((spell) => {
                  const spellMod = (() => {
                    if (!character?.ability_scores || !character.spellcasting_ability) return 0;
                    const final = finalAbilityScores(
                      character.ability_scores,
                      character.ability_scores.background_bonus_primary,
                      character.ability_scores.background_bonus_secondary,
                    );
                    const abilityKey = character.spellcasting_ability as AbilityName;
                    return abilityModifier(final[abilityKey] ?? 10) + profBonus;
                  })();
                  const [countStr, rest] = spell.damage_dice!.split("d");
                  const [sidesStr, modStr] = (rest ?? "6").split(/[+-]/);
                  const sides = parseInt(sidesStr) || 6;
                  const count = parseInt(countStr) || 1;
                  const flatMod = spell.damage_dice!.includes("+")
                    ? parseInt(modStr) || 0
                    : spell.damage_dice!.includes("-")
                      ? -(parseInt(modStr) || 0)
                      : 0;
                  return (
                    <div key={spell.id} className="flex flex-col gap-1">
                      {spell.attack_type && (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-7 text-xs font-medium"
                          disabled={locked}
                          onClick={() => doRoll("d20", 20, spellMod, `${spell.name} Attack`)}
                        >
                          {spell.name} {sign(spellMod)} ✦
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        disabled={locked}
                        onClick={() => doRoll(`d${sides}`, sides, flatMod + (count - 1) * Math.ceil(sides / 2), `${spell.name} Dmg`)}
                      >
                        {spell.damage_dice} {spell.damage_type ?? ""} ✦
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
            <Separator />
          </>
        )}

        {/* ── Saving Throws ───────────────────────────────────────────────────── */}
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
      </div>
    </ScrollArea>
  );
}
