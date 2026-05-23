import { useState, useEffect, useRef, useCallback } from "react";
import { Badge } from "@/core/components/ui/badge";
import { Separator } from "@/core/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/core/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/core/components/ui/popover";
import { HPAdjuster } from "./HPAdjuster";
import { DamageHealControl } from "./DamageHealControl";
import type { DamageResult } from "../hooks/useEncounterParticipants";
import { useSpellSlots } from "@/features/characters/hooks/useSpellSlots";
import {
  abilityModifier,
  finalAbilityScores,
  deriveStats,
  passiveScore,
  computeAttackRoll,
} from "@/features/characters/types/character.types";
import { CLASSES } from "@/features/characters/data/dnd2024.constants";
import { hasJackOfAllTrades, halfProficiencyBonus, CONDITION_EFFECTS, exhaustionD20Penalty, MASTERY_INFO } from "@/features/characters/data/rules2024";
import type { CharacterResource, CharacterFeature } from "@/features/characters/types/character.types";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import type {
  CharacterWithScores,
  CharacterSpell,
  CharacterAttack,
  AbilityName,
} from "@/features/characters/types/character.types";
import type { EncounterParticipant } from "../types/encounter.types";

// ── Static lookup tables ─────────────────────────────────────────────────────

const ABBRS = ["STR", "DEX", "CON", "INT", "WIS", "CHA"] as const;
const ABILITIES: AbilityName[] = [
  "strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma",
];

const SKILL_ABILITY: Record<string, string> = {
  Acrobatics: "DEX", "Animal Handling": "WIS", Arcana: "INT",
  Athletics: "STR", Deception: "CHA", History: "INT",
  Insight: "WIS", Intimidation: "CHA", Investigation: "INT",
  Medicine: "WIS", Nature: "INT", Perception: "WIS",
  Performance: "CHA", Persuasion: "CHA", Religion: "INT",
  "Sleight of Hand": "DEX", Stealth: "DEX", Survival: "WIS",
};

const SKILL_DESC: Record<string, string> = {
  Acrobatics: "Balance, flip, dive, and roll to stay on your feet.",
  "Animal Handling": "Calm animals, keep mounts steady, and sense animal intent.",
  Arcana: "Recall lore about spells, magic items, and magical traditions.",
  Athletics: "Climb, jump, swim, or perform demanding physical feats.",
  Deception: "Mislead others through lies, misdirection, or disguise.",
  History: "Recall lore about historical events, legends, and civilisations.",
  Insight: "Discern true intentions and detect lies or hidden emotions.",
  Intimidation: "Influence others through threats, hostile action, or force of will.",
  Investigation: "Search for clues, deduce from evidence, and spot hidden things.",
  Medicine: "Stabilise the dying, diagnose illness, or treat wounds.",
  Nature: "Recall lore about terrain, plants, animals, and weather.",
  Perception: "Spot, hear, or otherwise detect the presence of something.",
  Performance: "Entertain an audience through music, dance, acting, or storytelling.",
  Persuasion: "Influence others with tact, diplomacy, and social grace.",
  Religion: "Recall lore about deities, rites, cults, and the undead.",
  "Sleight of Hand": "Perform feats of manual trickery such as pickpocketing.",
  Stealth: "Conceal yourself from enemies and move without being detected.",
  Survival: "Track creatures, forage for food, and navigate the wilderness.",
};

const SAVE_DESC: Record<string, string> = {
  STR: "Resist being physically forced, grappled, or shoved.",
  DEX: "Dodge area-of-effect attacks, traps, and hazards.",
  CON: "Maintain concentration, resist exhaustion and poison.",
  INT: "Resist memory tampering, illusions, and mental intrusion.",
  WIS: "Resist charms, compulsion, fright, and possession.",
  CHA: "Resist being banished, possessed, or erased from existence.",
};

// ── Hover-aware popover hook ─────────────────────────────────────────────────

function useHoverPopover() {
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const open_ = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setOpen(true);
  }, []);

  const scheduleClose = useCallback(() => {
    timer.current = setTimeout(() => setOpen(false), 150);
  }, []);

  return { open, setOpen, onMouseEnter: open_, onMouseLeave: scheduleClose };
}

// ── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
      {children}
    </p>
  );
}

function SpellPopover({ spell }: { spell: CharacterSpell }) {
  const levelLabel = spell.level === 0 ? "Cantrip" : `Level ${spell.level}`;
  const hover = useHoverPopover();
  return (
    <Popover open={hover.open} onOpenChange={hover.setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onMouseEnter={hover.onMouseEnter}
          onMouseLeave={hover.onMouseLeave}
          className="w-full text-left flex items-center justify-between gap-1.5 rounded px-2 py-1 hover:bg-accent/40 transition-colors group"
        >
          <span className="text-xs truncate group-hover:text-foreground text-muted-foreground">
            {spell.name}
          </span>
          <div className="flex items-center gap-1 shrink-0">
            {spell.concentration && (
              <span className="text-[9px] text-yellow-500 font-bold">C</span>
            )}
            {spell.damage_dice && (
              <span className="text-[9px] text-muted-foreground">{spell.damage_dice}</span>
            )}
          </div>
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="left"
        align="start"
        className="w-72 p-3 space-y-2"
        onMouseEnter={hover.onMouseEnter}
        onMouseLeave={hover.onMouseLeave}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold text-sm leading-tight">{spell.name}</p>
          <div className="flex gap-1 shrink-0">
            <Badge variant="secondary" className="text-[10px]">{levelLabel}</Badge>
            {spell.school && (
              <Badge variant="outline" className="text-[10px]">{spell.school}</Badge>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          {spell.casting_time && (
            <>
              <span className="font-medium text-foreground">Casting Time</span>
              <span>{spell.casting_time}</span>
            </>
          )}
          {spell.range_text && (
            <>
              <span className="font-medium text-foreground">Range</span>
              <span>{spell.range_text}</span>
            </>
          )}
          {spell.components && spell.components.length > 0 && (
            <>
              <span className="font-medium text-foreground">Components</span>
              <span>{spell.components.join(", ")}</span>
            </>
          )}
          {spell.damage_dice && (
            <>
              <span className="font-medium text-foreground">Damage</span>
              <span>{spell.damage_dice}{spell.damage_type ? ` ${spell.damage_type}` : ""}</span>
            </>
          )}
          {spell.concentration && (
            <>
              <span className="font-medium text-foreground">Concentration</span>
              <span>Yes</span>
            </>
          )}
          {spell.is_ritual && (
            <>
              <span className="font-medium text-foreground">Ritual</span>
              <span>Yes</span>
            </>
          )}
        </div>

        {spell.description && (
          <p className="text-xs text-muted-foreground leading-relaxed border-t pt-2 max-h-40 overflow-y-auto">
            {spell.description}
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}

function AttackRow({ attack, character }: { attack: CharacterAttack; character: CharacterWithScores }) {
  const sign = (n: number) => (n >= 0 ? `+${n}` : String(n));
  const hover = useHoverPopover();
  const { attackMod, damageMod, diceCount } = computeAttackRoll(character, attack);
  return (
    <Popover open={hover.open} onOpenChange={hover.setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onMouseEnter={hover.onMouseEnter}
          onMouseLeave={hover.onMouseLeave}
          className="w-full text-left flex items-center justify-between gap-1.5 rounded px-2 py-1 hover:bg-accent/40 transition-colors group"
        >
          <span className="text-xs truncate group-hover:text-foreground text-muted-foreground">
            {attack.name}
          </span>
          <span className="text-[10px] text-muted-foreground shrink-0">
            {sign(attackMod)} · {diceCount}d{attack.dice_sides}{sign(damageMod)}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="left"
        align="start"
        className="w-64 p-3 space-y-2"
        onMouseEnter={hover.onMouseEnter}
        onMouseLeave={hover.onMouseLeave}
      >
        <p className="font-semibold text-sm">{attack.name}</p>
        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs">
          <span className="text-muted-foreground">Attack</span>
          <span>{sign(attackMod)} to hit</span>
          <span className="text-muted-foreground">Damage</span>
          <span>
            {diceCount}d{attack.dice_sides}{sign(damageMod)} {attack.damage_type}
          </span>
          <span className="text-muted-foreground">Type</span>
          <span>{attack.is_spell ? "Spell" : attack.is_ranged ? "Ranged" : "Melee"}</span>
          {(attack.is_finesse || attack.is_thrown || attack.is_light || attack.versatile_sides) && (
            <>
              <span className="text-muted-foreground">Properties</span>
              <span>
                {[
                  attack.is_finesse && "Finesse",
                  attack.is_thrown && "Thrown",
                  attack.is_light && "Light",
                  attack.versatile_sides && `Versatile d${attack.versatile_sides}`,
                ].filter(Boolean).join(", ")}
              </span>
            </>
          )}
          {attack.mastery && (
            <>
              <span className="text-muted-foreground">Mastery</span>
              <span>{attack.mastery}</span>
            </>
          )}
        </div>
        {attack.mastery && (
          <p className="text-[11px] text-muted-foreground border-t pt-2">
            {MASTERY_INFO[attack.mastery as keyof typeof MASTERY_INFO]}
          </p>
        )}
        {attack.notes && (
          <p className="text-xs text-muted-foreground border-t pt-2">{attack.notes}</p>
        )}
      </PopoverContent>
    </Popover>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

interface Props {
  character: CharacterWithScores;
  participant: EncounterParticipant;
  onApplyDamage: (amount: number, type: string | null, opts?: { crit?: boolean }) => Promise<DamageResult>;
  onHeal: (amount: number) => void;
  onSetConcentration: (spell: string | null) => void;
}

export function CharacterQuickRef({ character, participant, onApplyDamage, onHeal, onSetConcentration }: Props) {
  const [spells, setSpells] = useState<CharacterSpell[]>([]);
  const [attacks, setAttacks] = useState<CharacterAttack[]>([]);
  const [resources, setResources] = useState<CharacterResource[]>([]);
  const [features, setFeatures] = useState<CharacterFeature[]>([]);

  useEffect(() => {
    supabase
      .from("character_spells")
      .select("*")
      .eq("character_id", character.id)
      .order("level")
      .order("name")
      .then(({ data }) => setSpells((data as CharacterSpell[]) ?? []));

    supabase
      .from("character_attacks")
      .select("*")
      .eq("character_id", character.id)
      .order("name")
      .then(({ data }) => setAttacks((data as CharacterAttack[]) ?? []));

    supabase
      .from("character_resources")
      .select("*")
      .eq("character_id", character.id)
      .order("sort_order")
      .then(({ data }) => setResources((data as CharacterResource[]) ?? []));

    supabase
      .from("character_features")
      .select("*")
      .eq("character_id", character.id)
      .order("level_gained")
      .order("sort_order")
      .then(({ data }) => setFeatures((data as CharacterFeature[]) ?? []));
  }, [character.id]);

  const scores = character.ability_scores;
  const base = scores ?? {
    strength: 10, dexterity: 10, constitution: 10,
    intelligence: 10, wisdom: 10, charisma: 10,
  };
  const final = finalAbilityScores(base, scores?.background_bonus_primary, scores?.background_bonus_secondary);
  const derived = deriveStats(final, character.level);
  const mods = derived.modifiers;
  const joat = hasJackOfAllTrades(character.class, character.level);
  const joatBonus = joat ? halfProficiencyBonus(derived.proficiencyBonus) : 0;
  const initiativeMod = derived.initiative + joatBonus;

  const conditions = participant.conditions ?? [];
  const senses = [
    { label: "Darkvision", v: character.darkvision },
    { label: "Blindsight", v: character.blindsight },
    { label: "Tremorsense", v: character.tremorsense },
    { label: "Truesight", v: character.truesight },
  ].filter((s) => (s.v ?? 0) > 0);
  const movement = [
    { label: "Fly", v: character.fly_speed },
    { label: "Swim", v: character.swim_speed },
    { label: "Climb", v: character.climb_speed },
    { label: "Burrow", v: character.burrow_speed },
  ].filter((m) => (m.v ?? 0) > 0);
  const defenses = [
    { label: "Resistances", v: character.damage_resistances },
    { label: "Immunities", v: character.damage_immunities },
    { label: "Vulnerabilities", v: character.damage_vulnerabilities },
    { label: "Condition Immune", v: character.condition_immunities },
  ].filter((d) => (d.v ?? []).length > 0);
  const hasStatus = conditions.length > 0 || (participant.exhaustion ?? 0) > 0 || participant.heroic_inspiration || !!participant.concentrating_on;
  const hasDefSenses = defenses.length > 0 || senses.length > 0 || movement.length > 0;

  const classData = CLASSES.find((c) => c.name === character.class);
  const hitDieSize = classData?.hitDie ?? 8;
  const saveProfAbbrs = (classData?.savingThrows ?? []).map(
    (a) => ABBRS[ABILITIES.indexOf(a)]
  );

  const hpCurrent = character.hp_current ?? participant.hp_current;
  const hpMax = character.hp_max ?? participant.hp_max;
  const isDying = hpCurrent <= 0;

  const { slots, expend, recover } = useSpellSlots(character.id, character.class, character.level, character.subclass);
  const hasSpellSlots = slots.some((s) => s.slots_total > 0);

  const sign = (n: number) => (n >= 0 ? `+${n}` : String(n));

  const cantrips = spells.filter((s) => s.level === 0);
  const preparedSpells = spells.filter((s) => s.level > 0 && s.is_prepared);
  const spellLevels = [...new Set(preparedSpells.map((s) => s.level))].sort((a, b) => a - b);

  const proficientSkills = character.proficiencies.filter((p) => p.skill in SKILL_ABILITY);
  const skillMod = (skill: string) => {
    const abilityAbbr = SKILL_ABILITY[skill];
    const abilityIdx = ABBRS.indexOf(abilityAbbr as typeof ABBRS[number]);
    const ability = ABILITIES[abilityIdx];
    const base = abilityIdx >= 0 ? mods[ability] : 0;
    const prof = character.proficiencies.find((p) => p.skill === skill);
    if (!prof) return base;
    return prof.is_expertise ? base + derived.proficiencyBonus * 2 : base + derived.proficiencyBonus;
  };

  return (
    <div className="space-y-3 text-xs">

      {/* ── HP ─────────────────────────────────────────────────────────────── */}
      <div>
        <span className="font-semibold text-muted-foreground uppercase tracking-wide text-[10px] block mb-1">Hit Points</span>
        <HPAdjuster current={hpCurrent} max={hpMax} />
        {character.hp_temp > 0 && (
          <Badge variant="secondary" className="text-blue-400 mt-1 text-[10px]">
            +{character.hp_temp} temp
          </Badge>
        )}
        <div className="mt-2">
          <DamageHealControl
            participant={participant}
            onApplyDamage={onApplyDamage}
            onHeal={onHeal}
            onSetConcentration={onSetConcentration}
          />
        </div>
      </div>

      {/* ── Death Saves ────────────────────────────────────────────────────── */}
      {isDying && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 p-2">
          <p className="font-semibold text-destructive mb-1 text-[10px] uppercase tracking-wide">Death Saves</p>
          <div className="flex gap-3">
            <div>
              <span className="text-green-500">S: </span>
              {"●".repeat(character.death_save_successes)}
              {"○".repeat(Math.max(0, 3 - character.death_save_successes))}
            </div>
            <div>
              <span className="text-destructive">F: </span>
              {"●".repeat(character.death_save_failures)}
              {"○".repeat(Math.max(0, 3 - character.death_save_failures))}
            </div>
          </div>
        </div>
      )}

      {/* ── Status (conditions / exhaustion / inspiration / concentration) ──── */}
      {hasStatus && (
        <>
          <Separator />
          <div className="space-y-1">
            <SectionLabel>Status</SectionLabel>
            {participant.heroic_inspiration && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Heroic Inspiration</span>
                <span className="font-semibold text-secondary">Available</span>
              </div>
            )}
            {(participant.exhaustion ?? 0) > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Exhaustion</span>
                <span className="font-semibold text-destructive">
                  Lv {participant.exhaustion} ({exhaustionD20Penalty(participant.exhaustion)} d20)
                </span>
              </div>
            )}
            {participant.concentrating_on && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Concentrating</span>
                <span className="font-semibold text-primary">{participant.concentrating_on}</span>
              </div>
            )}
            {conditions.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-0.5">
                {conditions.map((c) => (
                  <Tooltip key={c}>
                    <TooltipTrigger asChild>
                      <Badge variant="outline" className="text-[10px] border-destructive/40 text-destructive cursor-default">{c}</Badge>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="max-w-52 text-xs">{CONDITION_EFFECTS[c]?.note ?? c}</TooltipContent>
                  </Tooltip>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <Separator />

      {/* ── Derived Stats ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-1 text-center">
        {[
          { label: "AC",   value: character.ac ?? "—", tip: "Armour Class — attacks must meet or beat this to hit." },
          { label: "Spd",  value: character.speed ?? 30, tip: `Movement speed per turn in feet.` },
          { label: "Init", value: sign(initiativeMod), tip: "Initiative bonus (DEX mod) rolled at start of combat." },
          { label: "Prof", value: sign(derived.proficiencyBonus), tip: "Proficiency bonus added to proficient skills, saves, and attacks." },
        ].map(({ label, value, tip }) => (
          <Tooltip key={label}>
            <TooltipTrigger asChild>
              <div className="rounded bg-muted/40 py-1 px-0.5 cursor-default">
                <p className="text-muted-foreground leading-none mb-0.5 text-[9px]">{label}</p>
                <p className="font-bold text-sm">{value}</p>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-48 text-xs">{tip}</TooltipContent>
          </Tooltip>
        ))}
      </div>

      {/* ── Passive Perception ─────────────────────────────────────────────── */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center justify-between text-muted-foreground cursor-default px-0.5">
            <span>Passive Perception</span>
            <span className="font-semibold text-foreground">{passiveScore(final, derived.proficiencyBonus, "Perception", character.proficiencies, joat)}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="left" className="max-w-48 text-xs">
          10 + Perception modifier. Used when not actively searching.
        </TooltipContent>
      </Tooltip>

      <Separator />

      {/* ── Ability Scores ─────────────────────────────────────────────────── */}
      <div>
        <SectionLabel>Abilities</SectionLabel>
        <div className="grid grid-cols-3 gap-1 text-center">
          {ABILITIES.map((ability, i) => {
            const mod = abilityModifier(final[ability]);
            const abbr = ABBRS[i];
            return (
              <Tooltip key={ability}>
                <TooltipTrigger asChild>
                  <div className="rounded bg-muted/40 py-1 cursor-default">
                    <p className="text-muted-foreground text-[9px] leading-none mb-0.5">{abbr}</p>
                    <p className="font-black text-sm">{sign(mod)}</p>
                    <p className="text-muted-foreground text-[9px] leading-none">{final[ability]}</p>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  {ability.charAt(0).toUpperCase() + ability.slice(1)} {final[ability]} — mod {sign(mod)}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </div>

      <Separator />

      {/* ── Saving Throws ──────────────────────────────────────────────────── */}
      <div>
        <SectionLabel>Saving Throws</SectionLabel>
        <div className="grid grid-cols-3 gap-1">
          {ABBRS.map((abbr, i) => {
            const ability = ABILITIES[i];
            const isProficient = saveProfAbbrs.includes(abbr);
            const mod = isProficient ? mods[ability] + derived.proficiencyBonus : mods[ability];
            return (
              <Tooltip key={abbr}>
                <TooltipTrigger asChild>
                  <div className={cn(
                    "rounded py-1 px-1.5 text-center cursor-default",
                    isProficient ? "bg-primary/10" : "bg-muted/40"
                  )}>
                    <p className={cn("text-[9px] leading-none mb-0.5", isProficient ? "text-primary" : "text-muted-foreground")}>
                      {abbr}{isProficient ? " ★" : ""}
                    </p>
                    <p className={cn("font-bold text-xs", isProficient ? "text-primary" : "")}>{sign(mod)}</p>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-44 text-xs">
                  <p className="font-semibold mb-0.5">{ability.charAt(0).toUpperCase() + ability.slice(1)} Save{isProficient ? " (proficient)" : ""}</p>
                  <p>{SAVE_DESC[abbr]}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </div>

      {/* ── Defenses, Senses & Movement ────────────────────────────────────── */}
      {hasDefSenses && (
        <>
          <Separator />
          <div className="space-y-1">
            <SectionLabel>Defenses &amp; Senses</SectionLabel>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Size</span>
              <span className="font-semibold">{character.size}</span>
            </div>
            {senses.map((s) => (
              <div key={s.label} className="flex items-center justify-between">
                <span className="text-muted-foreground">{s.label}</span>
                <span className="font-semibold">{s.v} ft</span>
              </div>
            ))}
            {movement.map((m) => (
              <div key={m.label} className="flex items-center justify-between">
                <span className="text-muted-foreground">{m.label} Speed</span>
                <span className="font-semibold">{m.v} ft</span>
              </div>
            ))}
            {defenses.map((d) => (
              <div key={d.label} className="flex items-start justify-between gap-2">
                <span className="text-muted-foreground shrink-0">{d.label}</span>
                <span className="font-medium text-right capitalize">{(d.v ?? []).join(", ")}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Proficient Skills ──────────────────────────────────────────────── */}
      {proficientSkills.length > 0 && (
        <>
          <Separator />
          <div>
            <SectionLabel>Skills</SectionLabel>
            <div className="space-y-0.5">
              {proficientSkills.map((prof) => {
                const mod = skillMod(prof.skill);
                return (
                  <Tooltip key={prof.id}>
                    <TooltipTrigger asChild>
                      <div className="flex items-center justify-between px-2 py-0.5 rounded hover:bg-accent/30 cursor-default transition-colors">
                        <span className="text-xs text-muted-foreground">
                          {prof.skill}
                          {prof.is_expertise ? " ★★" : " ★"}
                        </span>
                        <span className="text-xs font-semibold">{sign(mod)}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="max-w-52 text-xs space-y-1">
                      <p className="font-semibold">{prof.skill} ({SKILL_ABILITY[prof.skill]}){prof.is_expertise ? " — Expertise" : " — Proficient"}</p>
                      <p>{SKILL_DESC[prof.skill]}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* ── Attacks ────────────────────────────────────────────────────────── */}
      {attacks.length > 0 && (
        <>
          <Separator />
          <div>
            <SectionLabel>Attacks</SectionLabel>
            <div className="space-y-0.5">
              {attacks.map((atk) => <AttackRow key={atk.id} attack={atk} character={character} />)}
            </div>
          </div>
        </>
      )}

      {/* ── Cantrips ───────────────────────────────────────────────────────── */}
      {cantrips.length > 0 && (
        <>
          <Separator />
          <div>
            <SectionLabel>Cantrips</SectionLabel>
            <div className="space-y-0.5">
              {cantrips.map((s) => <SpellPopover key={s.id} spell={s} />)}
            </div>
          </div>
        </>
      )}

      {/* ── Spell Slots ────────────────────────────────────────────────────── */}
      {hasSpellSlots && (
        <>
          <Separator />
          <div>
            <SectionLabel>Spell Slots</SectionLabel>
            <div className="space-y-1.5">
              {slots.filter((s) => s.slots_total > 0).map((slot) => {
                const available = slot.slots_total - slot.slots_expended;
                return (
                  <div key={slot.spell_level} className="flex items-center gap-1.5">
                    <span className="w-5 text-muted-foreground text-[10px]">L{slot.spell_level}</span>
                    <div className="flex gap-0.5 flex-1">
                      {Array.from({ length: slot.slots_total }, (_, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => i < available ? expend(slot.spell_level) : recover(slot.spell_level)}
                          className={cn(
                            "w-4 h-4 rounded-full border transition-colors",
                            i < available
                              ? "bg-primary border-primary hover:opacity-70"
                              : "bg-transparent border-muted-foreground/40 hover:border-primary"
                          )}
                        />
                      ))}
                    </div>
                    <span className="text-muted-foreground text-[10px]">{available}/{slot.slots_total}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* ── Prepared Spells by Level ───────────────────────────────────────── */}
      {preparedSpells.length > 0 && (
        <>
          <Separator />
          <div>
            <SectionLabel>Spells</SectionLabel>
            <div className="space-y-2">
              {spellLevels.map((level) => {
                const levelSpells = preparedSpells.filter((s) => s.level === level);
                return (
                  <div key={level}>
                    <p className="text-[10px] text-muted-foreground px-2 mb-0.5">Level {level}</p>
                    <div className="space-y-0.5">
                      {levelSpells.map((s) => <SpellPopover key={s.id} spell={s} />)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* ── Class Resources ────────────────────────────────────────────────── */}
      {resources.length > 0 && (
        <>
          <Separator />
          <div>
            <SectionLabel>Resources</SectionLabel>
            <div className="space-y-0.5">
              {resources.map((r) => (
                <div key={r.id} className="flex items-center justify-between px-2">
                  <span className="text-muted-foreground">{r.name}</span>
                  <span className="font-semibold tabular-nums">{r.current}/{r.max}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── Features & Traits ──────────────────────────────────────────────── */}
      {features.length > 0 && (
        <>
          <Separator />
          <div>
            <SectionLabel>Features &amp; Traits</SectionLabel>
            <div className="flex flex-wrap gap-1">
              {features.map((f) => (
                <Tooltip key={f.id}>
                  <TooltipTrigger asChild>
                    <Badge variant="secondary" className="text-[10px] cursor-default">{f.name}</Badge>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="max-w-60 text-xs">
                    {f.description ?? f.name}{f.choice ? ` — ${f.choice}` : ""}
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── Hit Dice + Class ───────────────────────────────────────────────── */}
      <Separator />
      <div className="space-y-1 text-muted-foreground">
        <div className="flex items-center justify-between">
          <span>Hit Dice</span>
          <span className="font-semibold text-foreground">
            {character.hit_dice_current ?? character.level}/{character.level}d{hitDieSize}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>{character.name}</span>
          <span className="font-semibold text-foreground">
            {character.class} {character.level}
            {character.subclass ? ` · ${character.subclass}` : ""}
          </span>
        </div>
      </div>
    </div>
  );
}
