import { useState, useEffect } from "react";
import { Badge } from "@/core/components/ui/badge";
import { Button } from "@/core/components/ui/button";
import { Separator } from "@/core/components/ui/separator";
import { ScrollArea } from "@/core/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/core/components/ui/select";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/core/components/ui/tooltip";
import { Sparkles, Brain, Shield, Crosshair, Swords, Flame, Hand, Axe } from "lucide-react";
import { useDice } from "../context/DiceContext";
import { DicePoolBuilder } from "./DicePoolBuilder";
import {
  abilityModifier,
  finalAbilityScores,
  deriveStats,
  cantripDiceMultiplier,
  computeAttackRoll,
} from "@/features/characters/types/character.types";
import { CLASSES, resolveSpellcastingAbility } from "@/features/characters/data/dnd2024.constants";
import { useSpellSlots } from "@/features/characters/hooks/useSpellSlots";
import type { CharacterSpellSlot } from "@/features/characters/types/character.types";
import { aggregateConditions, exhaustionD20Penalty, hasJackOfAllTrades, halfProficiencyBonus, coverAcBonus, COVER_OPTIONS, MASTERY_INFO } from "@/features/characters/data/rules2024";
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
  cast: "bg-primary/10 text-primary hover:bg-primary/20 border-0",
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

// Render the lightweight markdown used in SRD text: _italic_ and **bold**.
function renderInline(text: string) {
  return text.split(/(\*\*[^*]+\*\*|_[^_]+_)/g).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <strong key={i} className="font-semibold text-foreground/90">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("_") && part.endsWith("_") && part.length > 2) {
      return <em key={i} className="italic text-foreground/90">{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

// ── Attack / spell action card ──────────────────────────────────────────────

function AttackCard({
  name,
  typeLabel,
  damageType,
  description,
  attackMod,
  damageLabel,
  disabled,
  adjust = "none",
  mastery,
  onAttack,
  onDamage,
  onCritDamage,
  onVersatileDamage,
  versatileLabel,
  onOffhandDamage,
  onCleaveDamage,
  castControl,
}: {
  name: string;
  typeLabel: string;
  damageType: string;
  description: string | null;
  attackMod: number | null;
  damageLabel: string;
  disabled: boolean;
  adjust?: "advantage" | "disadvantage" | "none";
  mastery?: string | null;
  onAttack: () => void;
  onDamage: () => void;
  onCritDamage?: () => void;
  onVersatileDamage?: () => void;
  versatileLabel?: string;
  onOffhandDamage?: () => void;
  onCleaveDamage?: () => void;
  castControl?: React.ReactNode;
}) {
  const sign = (n: number) => (n >= 0 ? `+${n}` : String(n));
  return (
    <div className="rounded-lg border bg-card/60 p-2.5 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-semibold flex-1 min-w-0 truncate">{name}</span>
        <Badge variant="outline" className="text-[10px] shrink-0 capitalize">{typeLabel}</Badge>
        {damageType && (
          <Badge variant="secondary" className="text-[10px] shrink-0 capitalize">{damageType}</Badge>
        )}
        {mastery && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="secondary"
                className="text-[10px] shrink-0 bg-primary/15 text-primary cursor-help underline decoration-dotted decoration-primary/60 underline-offset-2"
              >
                {mastery}
              </Badge>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs text-xs leading-relaxed">
              <span className="font-semibold">{mastery}.</span>{" "}
              {MASTERY_INFO[mastery as keyof typeof MASTERY_INFO]}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
      {description && (
        <p className="text-xs text-muted-foreground leading-relaxed">
          {renderInline(description)}
        </p>
      )}
      {/* Primary actions: aim (To Hit) + deal damage, colour-coded. */}
      <div className="flex gap-1.5">
        {attackMod !== null && (
          <Button
            size="sm"
            variant="default"
            className="flex-1 h-8 text-xs gap-1.5"
            disabled={disabled}
            onClick={onAttack}
          >
            <Crosshair className="h-3.5 w-3.5 shrink-0" />
            To Hit {sign(attackMod)}
            {adjust === "advantage" && <span className="font-bold">▲</span>}
            {adjust === "disadvantage" && <span className="font-bold">▼</span>}
          </Button>
        )}
        <Button
          size="sm"
          variant="destructive"
          className="flex-1 h-8 text-xs gap-1.5"
          disabled={disabled}
          onClick={onDamage}
        >
          <Swords className="h-3.5 w-3.5 shrink-0" />
          {damageLabel}
        </Button>
      </div>
      {/* Damage variants & extra attacks — tinted by family: red for damage
          variations of this swing (Crit/2H), neutral for separate attacks
          (Off-hand/Cleave). All clearly readable as buttons. */}
      {(onVersatileDamage || onCritDamage || onOffhandDamage || onCleaveDamage) && (
        <div className="flex flex-wrap gap-1.5">
          {onCritDamage && (
            <Button
              size="sm"
              variant="secondary"
              className="h-8 text-xs px-2 gap-1.5"
              disabled={disabled}
              onClick={onCritDamage}
              title="Critical hit: double the damage dice"
            >
              <Flame className="h-3.5 w-3.5" /> Crit
            </Button>
          )}
          {onVersatileDamage && (
            <Button
              size="sm"
              variant="secondary"
              className="h-8 text-xs px-2 gap-1.5"
              disabled={disabled}
              onClick={onVersatileDamage}
              title="Two-handed (versatile) damage"
            >
              <Swords className="h-3.5 w-3.5" /> 2H {versatileLabel}
            </Button>
          )}
          {onOffhandDamage && (
            <Button
              size="sm"
              variant="secondary"
              className="h-8 text-xs px-2 gap-1.5"
              disabled={disabled}
              onClick={onOffhandDamage}
              title="Two-Weapon Fighting off-hand attack: weapon dice with no ability modifier (unless you have the Two-Weapon Fighting style)"
            >
              <Hand className="h-3.5 w-3.5" /> Off-hand
            </Button>
          )}
          {onCleaveDamage && (
            <Button
              size="sm"
              variant="secondary"
              className="h-8 text-xs px-2 gap-1.5"
              disabled={disabled}
              onClick={onCleaveDamage}
              title="Cleave: damage a second creature within 5 ft (weapon dice, no ability modifier)"
            >
              <Axe className="h-3.5 w-3.5" /> Cleave
            </Button>
          )}
        </div>
      )}
      {castControl}
    </div>
  );
}

// Upcast picker + slot-expend control for a leveled spell, shown on its card in
// the encounter. `slots` and `onExpend` come from a single useSpellSlots in the
// parent so we don't open one realtime subscription per spell.
function SpellSlotCast({
  minLevel,
  slots,
  disabled,
  onExpend,
}: {
  minLevel: number;
  slots: CharacterSpellSlot[];
  disabled: boolean;
  onExpend: (level: number) => void;
}) {
  const options = slots
    .filter((s) => s.spell_level >= minLevel && s.slots_total - s.slots_expended > 0)
    .sort((a, b) => a.spell_level - b.spell_level);
  const [picked, setPicked] = useState<number | null>(null);
  const level = picked ?? options[0]?.spell_level ?? null;

  if (slots.every((s) => s.slots_total === 0)) return null;
  if (options.length === 0) {
    return <p className="text-[10px] text-muted-foreground">No spell slots available (level {minLevel}+)</p>;
  }
  return (
    <div className="flex gap-1.5">
      <Select value={level != null ? String(level) : undefined} onValueChange={(v) => setPicked(Number(v))} disabled={disabled}>
        <SelectTrigger className="h-8 flex-1 text-xs"><SelectValue placeholder="Slot level" /></SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.spell_level} value={String(o.spell_level)} className="text-xs">
              L{o.spell_level} ({o.slots_total - o.slots_expended} left)
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        size="sm"
        variant="default"
        className="flex-1 h-8 text-xs gap-1.5"
        disabled={disabled || level == null}
        onClick={() => level != null && onExpend(level)}
        title={level != null && level > minLevel ? `Cast upcast at level ${level} (expends an L${level} slot)` : "Cast (expends a slot)"}
      >
        <Sparkles className="h-3.5 w-3.5 shrink-0" />
        Cast{level != null && level > minLevel ? ` @L${level}` : ""}
      </Button>
    </div>
  );
}

interface Props {
  participant: EncounterParticipant;
  character: CharacterWithScores | null;
  attacks: CharacterAttack[];
  campaignId: string;
  encounterId: string;
  isMyTurn: boolean;
  isDM: boolean;
  canControl: boolean;
  onSetConcentration: (spell: string | null) => void;
  onSetHeroicInspiration: (value: boolean) => void;
  onSetCover: (cover: string) => void;
  onSetTurnFlag: (flag: "action_used" | "bonus_used" | "reaction_used" | "dodging", value: boolean) => void;
}

export function ActionPanel({
  participant,
  character,
  attacks,
  campaignId,
  encounterId,
  isMyTurn,
  isDM,
  canControl,
  onSetConcentration,
  onSetHeroicInspiration,
  onSetCover,
  onSetTurnFlag,
}: Props) {
  const { roll, rollPool, announceAction } = useDice();
  const [damageSpells, setDamageSpells] = useState<CharacterSpell[]>([]);
  const [spellDesc, setSpellDesc] = useState<Map<string, string>>(new Map());
  const [concentrationSpells, setConcentrationSpells] = useState<string[]>([]);
  // Single slots subscription for this participant's linked character (empty id
  // for NPCs yields no slots). Shared with each leveled-spell cast control.
  const { slots: spellSlots, expend: expendSpellSlot } = useSpellSlots(
    participant.character_id ?? "",
    character?.class ?? "",
    character?.level ?? 1,
    character?.subclass ?? null,
  );

  useEffect(() => {
    if (!participant.character_id) {
      setConcentrationSpells([]);
      return;
    }
    supabase
      .from("character_spells")
      .select("name")
      .eq("character_id", participant.character_id)
      .eq("concentration", true)
      .then(({ data }) => setConcentrationSpells((data ?? []).map((s) => s.name as string)));
  }, [participant.character_id]);

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

  // Pull SRD descriptions for any spell-type attacks so the cards read straight
  // from the parsed ruleset. Custom attacks fall back to their stored notes.
  const spellAttackNamesKey = attacks.filter((a) => a.is_spell).map((a) => a.name).join("|");
  useEffect(() => {
    const names = attacks.filter((a) => a.is_spell).map((a) => a.name);
    if (names.length === 0) {
      setSpellDesc(new Map());
      return;
    }
    supabase
      .from("srd_spells")
      .select("name, description")
      .in("name", names)
      .then(({ data }) => {
        const m = new Map<string, string>();
        (data ?? []).forEach((r) => {
          if (r.name && r.description) m.set((r.name as string).toLowerCase(), r.description as string);
        });
        setSpellDesc(m);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spellAttackNamesKey]);

  // Players see only portrait + description for NPCs — no stat block or roll controls
  if (!isDM && !participant.is_player) {
    return (
      <div className="flex flex-col gap-4">
        {participant.portrait_url ? (
          <img
            src={participant.portrait_url}
            alt={participant.name}
            className="w-full max-h-72 object-cover rounded-md"
          />
        ) : null}
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className="text-base font-bold">{participant.name}</span>
            <Badge variant="secondary" className="text-xs">NPC</Badge>
          </div>
          {participant.description ? (
            <p className="text-sm text-muted-foreground leading-relaxed">{participant.description}</p>
          ) : (
            <p className="text-xs text-muted-foreground italic">No description available.</p>
          )}
        </div>
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
    const classProfs = CLASSES.find((c) => c.name === character.class)?.savingThrows ?? [];
    const charProfs = (character.saving_throw_proficiencies as AbilityName[]) ?? [];
    savingThrowProfs = [...new Set([...classProfs, ...charProfs])];
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

  // Spell attack modifier from current stats (resolves class default if unset)
  const spellAbility = character
    ? resolveSpellcastingAbility(character.class, character.spellcasting_ability)
    : null;
  const spellAtkMod = (spellAbility ? mods[spellAbility] : 0) + profBonus;
  // Cantrip damage dice scale with character level (only meaningful for players)
  const cantripMult = character ? cantripDiceMultiplier(character.level) : 1;

  // Recompute weapon/spell attack & damage modifiers (and cantrip dice) live from
  // current character stats so they stay correct after level-ups and ability
  // changes. NPCs (no character stats) fall back to the values stored on the attack.
  function attackRoll(atk: CharacterAttack) {
    if (!participant.is_player || !character?.ability_scores) {
      return { attackMod: atk.attack_modifier, damageMod: atk.damage_modifier, diceCount: atk.dice_count };
    }
    return computeAttackRoll(character, atk);
  }

  // locked = can't interact with this panel (viewing another player's character as a non-DM)
  const locked = !canControl;
  const base = { campaignId, encounterId, characterName: participant.name, rolledByDm: isDM };

  function doRoll(diceType: string, sides: number, modifier: number, rollType: string) {
    roll({ ...base, diceType, sides, modifier, rollType });
  }

  // ── 2024 condition & exhaustion effects, auto-applied to d20 tests ───────────
  // Conditions come from the encounter participant; exhaustion (leveled) comes
  // from the linked character sheet. Effects mirror the parsed srd_rules glossary.
  const condEffects = aggregateConditions(participant.conditions ?? []);
  // Exhaustion is snapshotted onto the participant (synced from the character via
  // the sync_character_to_participants trigger), so it's reliable here.
  const exhaustionLevel = participant.exhaustion ?? 0;
  const exhaustPenalty = exhaustionD20Penalty(exhaustionLevel); // <= 0
  // Jack of All Trades: half prof on raw ability checks (Bard 2+).
  const joatBonus = participant.is_player && character && hasJackOfAllTrades(character.class, character.level)
    ? halfProficiencyBonus(profBonus)
    : 0;
  const attackAdjust = condEffects.attackAdjust;
  const attackOpts = {
    advantage: attackAdjust === "advantage",
    disadvantage: attackAdjust === "disadvantage",
  };

  // d20 tests support advantage/disadvantage, so route them through rollPool
  // (the single-die roll() has no adv/dis support).
  function rollD20(
    modifier: number,
    rollType: string,
    opts?: { advantage?: boolean; disadvantage?: boolean },
  ) {
    rollPool({
      campaignId,
      encounterId,
      characterName: participant.name,
      rolledByDm: isDM,
      pool: [{ sides: 20, count: 1 }],
      modifier,
      advantage: opts?.advantage ?? false,
      disadvantage: opts?.disadvantage ?? false,
      rollType,
    });
  }

  function useAction(label: string, category: ActionCategory, actionId?: string) {
    announceAction({
      campaignId,
      encounterId,
      characterName: participant.name,
      actionText: label,
      actionCategory: category,
    });
    // Claim the slot for the round so the buttons gate further use.
    if (category === "action") onSetTurnFlag("action_used", true);
    else if (category === "bonus") onSetTurnFlag("bonus_used", true);
    else if (category === "reaction") onSetTurnFlag("reaction_used", true);
    // Dodge also sets the dodging flag (cleared on this participant's next
    // turn by the advance-turn RPC).
    if (actionId === "dodge") onSetTurnFlag("dodging", true);
  }

  const charClass = character?.class ?? "";
  const classBonusActions = CLASS_BONUS_ACTIONS[charClass] ?? [];
  const classReactions = CLASS_REACTIONS[charClass] ?? [];
  const reactions = [...UNIVERSAL_REACTIONS, ...classReactions];
  const monsterActions = participant.actions ?? [];
  const monsterTraits = participant.special_abilities ?? [];

  const concentrationOptions = [
    ...new Set([
      ...(participant.concentrating_on ? [participant.concentrating_on] : []),
      ...concentrationSpells,
    ]),
  ];

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

        {/* Monster flavour / description (DM reference). */}
        {!participant.is_player && participant.description && (
          <p className="text-xs text-muted-foreground leading-relaxed italic">
            {participant.description}
          </p>
        )}

        {/* ── Combat status: Heroic Inspiration + Concentration (players) + Cover ─ */}
        <div className="rounded-md border bg-card/40 text-xs divide-y divide-border/40">
          {participant.is_player && (
            <div className="flex items-center justify-between gap-2 px-2.5 py-1.5">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5" /> Heroic Inspiration
              </span>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={locked}
                onClick={() => onSetHeroicInspiration(!participant.heroic_inspiration)}
                className={`h-6 px-2.5 text-xs border ${
                  participant.heroic_inspiration
                    ? "border-secondary/60 bg-secondary/15 text-secondary hover:bg-secondary/25"
                    : "border-border bg-transparent text-muted-foreground hover:bg-muted/40"
                }`}
                title="Heroic Inspiration: reroll any die once"
              >
                {participant.heroic_inspiration ? "Available" : "None"}
              </Button>
            </div>
          )}

          {participant.is_player && (
            <div className="flex items-center justify-between gap-2 px-2.5 py-1.5">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Brain className="h-3.5 w-3.5" /> Concentration
              </span>
              <Select
                value={participant.concentrating_on ?? "__none__"}
                onValueChange={(v) => onSetConcentration(v === "__none__" ? null : v)}
                disabled={locked}
              >
                <SelectTrigger className="h-6 w-40 text-xs">
                  <SelectValue placeholder="Concentrating…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Not concentrating</SelectItem>
                  {concentrationOptions.map((name) => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex items-center justify-between gap-2 px-2.5 py-1.5">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Shield className="h-3.5 w-3.5" /> Cover
            </span>
            <Select value={participant.cover} onValueChange={(v) => onSetCover(v)} disabled={locked}>
              <SelectTrigger className="h-6 w-40 text-xs">
                <SelectValue placeholder="No cover" />
              </SelectTrigger>
              <SelectContent>
                {COVER_OPTIONS.map((c) => (
                  <SelectItem key={c.value} value={c.value} className="text-xs">{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* ── Active condition / exhaustion effects ───────────────────────────── */}
        {(condEffects.notes.length > 0 || exhaustionLevel > 0) && (
          <div className="rounded-md border border-secondary/40 bg-secondary/10 p-2 space-y-1 text-xs">
            <p className="font-semibold text-secondary uppercase tracking-wide text-[10px]">
              Active Effects (auto-applied to rolls)
            </p>
            {exhaustionLevel > 0 && (
              <p>
                <span className="font-medium text-destructive">Exhaustion {exhaustionLevel}:</span>{" "}
                {exhaustPenalty} to all d20 tests, {-5 * exhaustionLevel} ft speed.
              </p>
            )}
            {condEffects.incapacitated && (
              <p className="text-destructive font-medium">
                Incapacitated — no action, bonus action, or reaction this turn.
              </p>
            )}
            {condEffects.autoFailStrDexSaves && (
              <p className="text-destructive">STR and DEX saving throws automatically fail.</p>
            )}
            {condEffects.notes.map((n) => (
              <p key={n.condition}>
                <span className="font-medium">{n.condition}:</span> {n.note}
              </p>
            ))}
          </div>
        )}

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
                  {participant.action_used && (
                    <span className="text-[10px] text-muted-foreground italic">used this turn</span>
                  )}
                  {participant.action_used && (
                    <button
                      type="button"
                      disabled={locked}
                      onClick={() => onSetTurnFlag("action_used", false)}
                      className="text-[10px] text-muted-foreground hover:text-foreground underline underline-offset-2 ml-auto"
                      title="DM override: refresh this slot"
                    >
                      reset
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {STANDARD_ACTIONS.map((a) => (
                    <Button
                      key={a.id}
                      size="sm"
                      variant="ghost"
                      disabled={locked || participant.action_used}
                      onClick={() => useAction(a.label, "action", a.id)}
                      className={cn(
                        "h-7 text-xs px-2",
                        ACTION_BTN_OVERRIDES[a.id] ?? SLOT_BTN.action,
                        (locked || participant.action_used) && "opacity-50",
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
                    {participant.bonus_used && (
                      <span className="text-[10px] text-muted-foreground italic">used this turn</span>
                    )}
                    {participant.bonus_used && (
                      <button
                        type="button"
                        disabled={locked}
                        onClick={() => onSetTurnFlag("bonus_used", false)}
                        className="text-[10px] text-muted-foreground hover:text-foreground underline underline-offset-2 ml-auto"
                        title="DM override: refresh this slot"
                      >
                        reset
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {classBonusActions.map((a) => (
                      <Button
                        key={a.id}
                        size="sm"
                        variant="ghost"
                        disabled={locked || participant.bonus_used}
                        onClick={() => useAction(a.label, "bonus", a.id)}
                        className={cn("h-7 text-xs px-2", SLOT_BTN.bonus, (locked || participant.bonus_used) && "opacity-50")}
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
                  {participant.reaction_used && (
                    <span className="text-[10px] text-muted-foreground italic">used this round</span>
                  )}
                  {participant.reaction_used && (
                    <button
                      type="button"
                      disabled={locked}
                      onClick={() => onSetTurnFlag("reaction_used", false)}
                      className="text-[10px] text-muted-foreground hover:text-foreground underline underline-offset-2 ml-auto"
                      title="DM override: refresh this slot"
                    >
                      reset
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {reactions.map((a) => (
                    <Button
                      key={a.id}
                      size="sm"
                      variant="ghost"
                      disabled={locked || participant.reaction_used}
                      onClick={() => useAction(a.label, "reaction", a.id)}
                      className={cn("h-7 text-xs px-2", SLOT_BTN.reaction, (locked || participant.reaction_used) && "opacity-50")}
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
                rolledByDm: isDM,
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

        {/* ── Monster Traits (passive special abilities) ──────────────────────── */}
        {monsterTraits.length > 0 && (
          <>
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">Traits</p>
              <div className="space-y-2">
                {monsterTraits.map((trait, i) => (
                  <div key={i} className="rounded-lg border bg-card/40 p-2.5 space-y-1">
                    <span className="text-sm font-semibold">{trait.name}</span>
                    {trait.desc && (
                      <p className="text-xs text-muted-foreground leading-relaxed">{renderInline(trait.desc)}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <Separator />
          </>
        )}

        {/* ── Monster Actions ─────────────────────────────────────────────────── */}
        {monsterActions.length > 0 && (
          <>
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">Actions</p>
              <div className="space-y-2">
                {monsterActions.map((action, i) => {
                  const hasDmg = !!action.damage_dice;
                  let count = 1, sides = 6, mod = 0;
                  if (hasDmg) {
                    const [countStr, rest] = action.damage_dice!.split("d");
                    const [sidesStr, modStr] = (rest ?? "6").split(/[+-]/);
                    sides = parseInt(sidesStr) || 6;
                    count = parseInt(countStr) || 1;
                    mod = action.damage_dice!.includes("+")
                      ? parseInt(modStr) || 0
                      : action.damage_dice!.includes("-")
                        ? -(parseInt(modStr) || 0)
                        : 0;
                  }
                  return (
                    <div key={i} className="rounded-lg border bg-card/60 p-2.5 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold flex-1 min-w-0">{action.name}</span>
                        {action.damage_type && (
                          <Badge variant="secondary" className="text-[10px] shrink-0 capitalize">{action.damage_type}</Badge>
                        )}
                      </div>
                      {action.desc && (
                        <p className="text-xs text-muted-foreground leading-relaxed">{renderInline(action.desc)}</p>
                      )}
                      {(action.attack_bonus != null || hasDmg) && (
                        <div className="flex flex-wrap gap-1.5">
                          {action.attack_bonus != null && (
                            <Button
                              size="sm"
                              variant="default"
                              className="h-8 text-xs gap-1.5"
                              disabled={locked}
                              onClick={() => rollD20(action.attack_bonus! + exhaustPenalty, `${action.name} Attack`, attackOpts)}
                            >
                              <Crosshair className="h-3.5 w-3.5 shrink-0" />
                              To Hit {sign(action.attack_bonus)}
                              {attackOpts.advantage && <span className="font-bold">▲</span>}
                              {attackOpts.disadvantage && <span className="font-bold">▼</span>}
                            </Button>
                          )}
                          {hasDmg && (
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-8 text-xs gap-1.5"
                              disabled={locked}
                              onClick={() => doRoll(`${count}d${sides}`, sides, mod, `${action.name} Dmg`)}
                            >
                              <Swords className="h-3.5 w-3.5 shrink-0" />
                              {action.damage_dice}
                            </Button>
                          )}
                          {hasDmg && (
                            <Button
                              size="sm"
                              variant="secondary"
                              className="h-8 text-xs px-2 gap-1.5"
                              disabled={locked}
                              onClick={() => doRoll(`${count * 2}d${sides}`, sides, mod, `${action.name} Crit`)}
                              title="Critical hit: double the damage dice"
                            >
                              <Flame className="h-3.5 w-3.5" /> Crit
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <Separator />
          </>
        )}

        {/* ── Attacks & Damage Spells ─────────────────────────────────────────── */}
        {(attacks.length > 0 || damageSpells.length > 0) && (
          <>
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">Attacks</p>
              <div className="space-y-2">
                {attacks.map((atk) => {
                  const { attackMod, damageMod, diceCount: dmgCount } = attackRoll(atk);
                  const toHit = attackMod + exhaustPenalty;
                  const typeLabel = atk.is_spell ? "Spell" : atk.is_ranged ? "Ranged" : "Melee";
                  // Custom notes win; otherwise read the description from the parsed SRD
                  const description = atk.notes || spellDesc.get(atk.name.toLowerCase()) || null;
                  const damageLabel = `${dmgCount}d${atk.dice_sides}${damageMod ? sign(damageMod) : ""}`;
                  // Off-hand and Cleave deal weapon dice without the positive
                  // ability modifier (a negative modifier still applies, per 2024).
                  const noPosMod = Math.min(0, damageMod);
                  return (
                    <AttackCard
                      key={atk.id}
                      name={atk.name}
                      typeLabel={typeLabel}
                      damageType={atk.damage_type}
                      description={description}
                      attackMod={toHit}
                      damageLabel={damageLabel}
                      disabled={locked}
                      adjust={attackAdjust}
                      mastery={atk.mastery}
                      versatileLabel={atk.versatile_sides ? `d${atk.versatile_sides}` : undefined}
                      onAttack={() => rollD20(toHit, `${atk.name} Attack`, attackOpts)}
                      onDamage={() => doRoll(`${dmgCount}d${atk.dice_sides}`, atk.dice_sides, damageMod, `${atk.name} Dmg`)}
                      onCritDamage={() => doRoll(`${dmgCount * 2}d${atk.dice_sides}`, atk.dice_sides, damageMod, `${atk.name} Crit`)}
                      onVersatileDamage={atk.versatile_sides
                        ? () => doRoll(`${dmgCount}d${atk.versatile_sides}`, atk.versatile_sides!, damageMod, `${atk.name} 2H Dmg`)
                        : undefined}
                      onOffhandDamage={atk.is_light && !atk.is_spell
                        ? () => doRoll(`${dmgCount}d${atk.dice_sides}`, atk.dice_sides, noPosMod, `${atk.name} Off-hand Dmg`)
                        : undefined}
                      onCleaveDamage={atk.mastery === "Cleave"
                        ? () => doRoll(`${dmgCount}d${atk.dice_sides}`, atk.dice_sides, noPosMod, `${atk.name} Cleave Dmg`)
                        : undefined}
                    />
                  );
                })}
                {damageSpells.map((spell) => {
                  const spellMod = spellAtkMod;
                  const [countStr, rest] = spell.damage_dice!.split("d");
                  const [sidesStr, modStr] = (rest ?? "6").split(/[+-]/);
                  const sides = parseInt(sidesStr) || 6;
                  const count = parseInt(countStr) || 1;
                  const flatMod = spell.damage_dice!.includes("+")
                    ? parseInt(modStr) || 0
                    : spell.damage_dice!.includes("-")
                      ? -(parseInt(modStr) || 0)
                      : 0;
                  // Cantrips (level 0) scale their dice with character level
                  const dmgCount = spell.level === 0 && character ? count * cantripMult : count;
                  const damageLabel = `${dmgCount}d${sides}${flatMod ? sign(flatMod) : ""}`;
                  const spellToHit = spellMod + exhaustPenalty;
                  return (
                    <AttackCard
                      key={spell.id}
                      name={spell.name}
                      typeLabel={spell.level === 0 ? "Cantrip" : "Spell"}
                      damageType={spell.damage_type ?? ""}
                      description={spell.description || null}
                      attackMod={spell.attack_type ? spellToHit : null}
                      damageLabel={damageLabel}
                      disabled={locked}
                      adjust={attackAdjust}
                      onAttack={() => rollD20(spellToHit, `${spell.name} Attack`, attackOpts)}
                      onDamage={() => doRoll(`${dmgCount}d${sides}`, sides, flatMod, `${spell.name} Dmg`)}
                      onCritDamage={() => doRoll(`${dmgCount * 2}d${sides}`, sides, flatMod, `${spell.name} Crit`)}
                      castControl={participant.is_player && spell.level > 0 ? (
                        <SpellSlotCast
                          minLevel={spell.level}
                          slots={spellSlots}
                          disabled={locked}
                          onExpend={(lvl) => expendSpellSlot(lvl)}
                        />
                      ) : undefined}
                    />
                  );
                })}
              </div>
            </div>
            <Separator />
          </>
        )}

        {/* ── Unarmed Strike (players) ────────────────────────────────────────── */}
        {participant.is_player && (
          <>
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">Unarmed Strike</p>
              <AttackCard
                name="Unarmed Strike"
                typeLabel="Melee"
                damageType="bludgeoning"
                description="Deal 1 + STR modifier bludgeoning, or instead Grapple or Shove (the target makes a save vs your DC)."
                attackMod={mods.strength + profBonus + exhaustPenalty}
                damageLabel={`${1 + mods.strength}`}
                disabled={locked}
                adjust={attackAdjust}
                onAttack={() => rollD20(mods.strength + profBonus + exhaustPenalty, "Unarmed Strike Attack", attackOpts)}
                onDamage={() => doRoll("1d1", 1, mods.strength, "Unarmed Strike Dmg")}
                castControl={
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs px-2"
                      disabled={locked || participant.action_used}
                      onClick={() => useAction("Grapple (Unarmed Strike)", "action")}
                      title="Grapple: the target makes a Strength or Dexterity save (DC 8 + STR mod + proficiency) or is Grappled."
                    >
                      Grapple
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs px-2"
                      disabled={locked || participant.action_used}
                      onClick={() => useAction("Shove (Unarmed Strike)", "action")}
                      title="Shove: the target makes a Strength or Dexterity save (DC 8 + STR mod + proficiency) or is pushed 5 ft or knocked Prone."
                    >
                      Shove
                    </Button>
                  </div>
                }
              />
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
                // Cover grants its AC bonus to DEX saves too (2024).
                const coverDexBonus = ability === "dexterity" ? coverAcBonus(participant.cover) : 0;
                const mod = saveMod(ability) + exhaustPenalty + coverDexBonus;
                const isProficient = savingThrowProfs.includes(ability);
                const label = ability.slice(0, 3).toUpperCase();
                const dexDis = ability === "dexterity" && condEffects.dexSaveDisadvantage;
                const autoFail = condEffects.autoFailStrDexSaves && (ability === "strength" || ability === "dexterity");
                return (
                  <Button
                    key={ability}
                    size="sm"
                    variant={isProficient ? "secondary" : "outline"}
                    className="h-8 text-xs"
                    disabled={locked}
                    onClick={() => rollD20(mod, `${label} Save`, { disadvantage: dexDis })}
                    title={autoFail ? "Automatically fails due to a condition" : isProficient ? "Proficient" : undefined}
                  >
                    {label} {sign(mod)}{isProficient ? " ★" : ""}
                    {autoFail && <span className="ml-1 text-destructive">auto-fail</span>}
                    {dexDis && !autoFail && <span className="ml-1 text-destructive">dis</span>}
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
                  const mod = skillMod(prof.skill) + exhaustPenalty;
                  return (
                    <Button
                      key={prof.id}
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      disabled={locked}
                      onClick={() => rollD20(mod, `${prof.skill} Check`, { disadvantage: condEffects.abilityCheckDisadvantage })}
                    >
                      {prof.skill} {sign(mod)}{prof.is_expertise ? " ★★" : " ★"}
                      {condEffects.abilityCheckDisadvantage && <span className="ml-1 text-destructive">dis</span>}
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
              const mod = mods[ability] + exhaustPenalty + joatBonus;
              return (
                <Button
                  key={label}
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs"
                  disabled={locked}
                  onClick={() => rollD20(mod, `${label} Check`, { disadvantage: condEffects.abilityCheckDisadvantage })}
                >
                  {label} {sign(mod)}
                  {condEffects.abilityCheckDisadvantage && <span className="ml-1 text-destructive">dis</span>}
                </Button>
              );
            })}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
