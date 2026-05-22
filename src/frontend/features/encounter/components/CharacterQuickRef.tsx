import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/core/components/ui/button";
import { Input } from "@/core/components/ui/input";
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
import { useSpellSlots } from "@/features/characters/hooks/useSpellSlots";
import {
  abilityModifier,
  finalAbilityScores,
  deriveStats,
} from "@/features/characters/types/character.types";
import { CLASSES } from "@/features/characters/data/dnd2024.constants";
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

function AttackRow({ attack }: { attack: CharacterAttack }) {
  const sign = (n: number) => (n >= 0 ? `+${n}` : String(n));
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
            {attack.name}
          </span>
          <span className="text-[10px] text-muted-foreground shrink-0">
            {sign(attack.attack_modifier)} · {attack.dice_count}d{attack.dice_sides}{sign(attack.damage_modifier)}
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
          <span>{sign(attack.attack_modifier)} to hit</span>
          <span className="text-muted-foreground">Damage</span>
          <span>
            {attack.dice_count}d{attack.dice_sides}{sign(attack.damage_modifier)} {attack.damage_type}
          </span>
          <span className="text-muted-foreground">Type</span>
          <span>{attack.is_spell ? "Spell" : attack.is_ranged ? "Ranged" : "Melee"}</span>
        </div>
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
  onUpdateHP: (participantId: string, delta: number) => Promise<void>;
}

export function CharacterQuickRef({ character, participant, onUpdateHP }: Props) {
  const [deltaInput, setDeltaInput] = useState("");
  const [applying, setApplying] = useState(false);
  const [spells, setSpells] = useState<CharacterSpell[]>([]);
  const [attacks, setAttacks] = useState<CharacterAttack[]>([]);

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
  }, [character.id]);

  const scores = character.ability_scores;
  const base = scores ?? {
    strength: 10, dexterity: 10, constitution: 10,
    intelligence: 10, wisdom: 10, charisma: 10,
  };
  const final = finalAbilityScores(base, scores?.background_bonus_primary, scores?.background_bonus_secondary);
  const derived = deriveStats(final, character.level);
  const mods = derived.modifiers;

  const classData = CLASSES.find((c) => c.name === character.class);
  const hitDieSize = classData?.hitDie ?? 8;
  const saveProfAbbrs = (classData?.savingThrows ?? []).map(
    (a) => ABBRS[ABILITIES.indexOf(a)]
  );

  const hpCurrent = participant.hp_current;
  const hpMax = participant.hp_max;
  const hpPct = hpMax > 0 ? Math.max(0, Math.min(100, (hpCurrent / hpMax) * 100)) : 0;
  const isDying = hpCurrent <= 0;

  const { slots, expend, recover } = useSpellSlots(character.id, character.class, character.level);
  const hasSpellSlots = slots.some((s) => s.slots_total > 0);

  const sign = (n: number) => (n >= 0 ? `+${n}` : String(n));

  async function applyDelta() {
    const parsed = parseInt(deltaInput, 10);
    if (isNaN(parsed) || parsed === 0) return;
    setApplying(true);
    await onUpdateHP(participant.id, parsed);
    setDeltaInput("");
    setApplying(false);
  }

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
        <div className="flex items-baseline justify-between mb-1">
          <span className="font-semibold text-muted-foreground uppercase tracking-wide text-[10px]">Hit Points</span>
          <span className={cn(
            "text-xl font-black",
            isDying ? "text-destructive" : hpPct < 40 ? "text-yellow-500" : "text-foreground"
          )}>
            {hpCurrent}
            <span className="text-sm font-normal text-muted-foreground"> / {hpMax}</span>
          </span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden mb-2">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              hpPct > 60 ? "bg-green-500" : hpPct > 30 ? "bg-yellow-500" : "bg-red-500"
            )}
            style={{ width: `${hpPct}%` }}
          />
        </div>
        {character.hp_temp > 0 && (
          <Badge variant="secondary" className="text-blue-400 mb-2 text-[10px]">
            +{character.hp_temp} temp
          </Badge>
        )}
        <div className="flex items-center gap-1">
          <Button type="button" size="sm" variant="default"
            className="h-6 w-6 p-0 font-bold"
            onClick={() => setDeltaInput((d) => String((parseInt(d) || 0) - 1))}>
            −
          </Button>
          <Input
            className="h-6 text-xs text-center w-14 px-1"
            placeholder="±HP"
            value={deltaInput}
            onChange={(e) => setDeltaInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") applyDelta();
              if (e.key === "Escape") setDeltaInput("");
            }}
          />
          <Button type="button" size="sm" variant="default"
            className="h-6 w-6 p-0 font-bold"
            onClick={() => setDeltaInput((d) => String((parseInt(d) || 0) + 1))}>
            +
          </Button>
          <Button size="sm" variant="default" className="h-6 text-xs px-2 ml-auto"
            disabled={!deltaInput || applying} onClick={applyDelta}>
            Apply
          </Button>
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

      <Separator />

      {/* ── Derived Stats ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-1 text-center">
        {[
          { label: "AC",   value: character.ac ?? "—", tip: "Armour Class — attacks must meet or beat this to hit." },
          { label: "Spd",  value: character.speed ?? 30, tip: `Movement speed per turn in feet.` },
          { label: "Init", value: sign(derived.initiative), tip: "Initiative bonus (DEX mod) rolled at start of combat." },
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
            <span className="font-semibold text-foreground">{derived.passivePerception}</span>
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
              {attacks.map((atk) => <AttackRow key={atk.id} attack={atk} />)}
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
