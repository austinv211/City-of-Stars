import { useState } from "react";
import { Button } from "@/core/components/ui/button";
import { Input } from "@/core/components/ui/input";
import { Badge } from "@/core/components/ui/badge";
import { Separator } from "@/core/components/ui/separator";
import { useSpellSlots } from "@/features/characters/hooks/useSpellSlots";
import {
  abilityModifier,
  finalAbilityScores,
  deriveStats,
} from "@/features/characters/types/character.types";
import { CLASSES } from "@/features/characters/data/dnd2024.constants";
import type { CharacterWithScores } from "@/features/characters/types/character.types";
import type { EncounterParticipant } from "../types/encounter.types";

interface Props {
  character: CharacterWithScores;
  participant: EncounterParticipant;
  onUpdateHP: (participantId: string, delta: number) => Promise<void>;
}

export function CharacterQuickRef({ character, participant, onUpdateHP }: Props) {
  const [deltaInput, setDeltaInput] = useState("");
  const [applying, setApplying] = useState(false);

  const scores = character.ability_scores;
  const base = scores ?? {
    strength: 10, dexterity: 10, constitution: 10,
    intelligence: 10, wisdom: 10, charisma: 10,
  };
  const final = finalAbilityScores(base, scores?.background_bonus_primary, scores?.background_bonus_secondary);
  const derived = deriveStats(final, character.level);

  const classData = CLASSES.find((c) => c.name === character.class);
  const hitDieSize = classData?.hitDie ?? 8;

  const hpCurrent = participant.hp_current;
  const hpMax = participant.hp_max;
  const hpPct = hpMax > 0 ? Math.max(0, Math.min(100, (hpCurrent / hpMax) * 100)) : 0;
  const isDying = hpCurrent <= 0;

  const { slots, expend, recover } = useSpellSlots(character.id, character.class, character.level);
  const hasSpells = slots.some((s) => s.slots_total > 0);

  const sign = (n: number) => (n >= 0 ? `+${n}` : String(n));

  async function applyDelta() {
    const parsed = parseInt(deltaInput, 10);
    if (isNaN(parsed) || parsed === 0) return;
    setApplying(true);
    await onUpdateHP(participant.id, parsed);
    setDeltaInput("");
    setApplying(false);
  }

  const ABBRS = ["STR", "DEX", "CON", "INT", "WIS", "CHA"] as const;
  const ABILITIES = ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"] as const;

  return (
    <div className="space-y-3 text-xs">

      {/* ── HP ─────────────────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-baseline justify-between mb-1">
          <span className="font-semibold text-muted-foreground uppercase tracking-wide text-[10px]">Hit Points</span>
          <span className={`text-xl font-black ${
            isDying ? "text-red-500" :
            hpPct < 40 ? "text-yellow-500" :
            "text-foreground"
          }`}>
            {hpCurrent}
            <span className="text-sm font-normal text-muted-foreground"> / {hpMax}</span>
          </span>
        </div>

        <div className="h-2 bg-muted rounded-full overflow-hidden mb-2">
          <div
            className={`h-full rounded-full transition-all ${
              hpPct > 60 ? "bg-green-500" :
              hpPct > 30 ? "bg-yellow-500" : "bg-red-500"
            }`}
            style={{ width: `${hpPct}%` }}
          />
        </div>

        {character.hp_temp > 0 && (
          <Badge variant="secondary" className="text-blue-400 mb-2 text-[10px]">
            +{character.hp_temp} temp
          </Badge>
        )}

        {/* Adjust HP */}
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-6 w-6 p-0 font-bold text-red-500 hover:text-red-400"
            onClick={() => setDeltaInput((d) => String((parseInt(d) || 0) - 1))}
          >
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
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-6 w-6 p-0 font-bold text-green-500 hover:text-green-400"
            onClick={() => setDeltaInput((d) => String((parseInt(d) || 0) + 1))}
          >
            +
          </Button>
          <Button
            size="sm"
            variant="default"
            className="h-6 text-xs px-2 ml-auto"
            disabled={!deltaInput || applying}
            onClick={applyDelta}
          >
            Apply
          </Button>
        </div>
      </div>

      {/* ── Death Saves ────────────────────────────────────────────────────── */}
      {isDying && (
        <div className="rounded-md bg-red-500/10 border border-red-500/20 p-2">
          <p className="font-semibold text-red-400 mb-1 text-[10px] uppercase tracking-wide">Death Saves</p>
          <div className="flex gap-3">
            <div>
              <span className="text-green-500">S: </span>
              {"●".repeat(character.death_save_successes)}
              {"○".repeat(Math.max(0, 3 - character.death_save_successes))}
            </div>
            <div>
              <span className="text-red-500">F: </span>
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
          { label: "AC",    value: character.ac ?? "—" },
          { label: "Spd",   value: character.speed ?? 30 },
          { label: "Init",  value: sign(derived.initiative) },
          { label: "Prof",  value: sign(derived.proficiencyBonus) },
        ].map(({ label, value }) => (
          <div key={label} className="rounded bg-muted/40 py-1 px-0.5">
            <p className="text-muted-foreground leading-none mb-0.5 text-[9px]">{label}</p>
            <p className="font-bold text-sm">{value}</p>
          </div>
        ))}
      </div>

      {/* ── Ability Mods ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-1 text-center">
        {ABILITIES.map((ability, i) => {
          const mod = abilityModifier(final[ability]);
          return (
            <div key={ability} className="rounded bg-muted/40 py-1">
              <p className="text-muted-foreground text-[9px] leading-none mb-0.5">{ABBRS[i]}</p>
              <p className="font-black text-sm">{sign(mod)}</p>
              <p className="text-muted-foreground text-[9px] leading-none">{final[ability]}</p>
            </div>
          );
        })}
      </div>

      {/* ── Hit Dice ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between text-muted-foreground">
        <span>Hit Dice</span>
        <span className="font-semibold text-foreground">
          {character.hit_dice_current ?? character.level}/{character.level}d{hitDieSize}
        </span>
      </div>

      {/* ── Spell Slots ────────────────────────────────────────────────────── */}
      {hasSpells && (
        <>
          <Separator />
          <div>
            <p className="font-semibold text-muted-foreground uppercase tracking-wide text-[10px] mb-1.5">
              Spell Slots
            </p>
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
                          className={`w-4 h-4 rounded-full border transition-colors ${
                            i < available
                              ? "bg-primary border-primary hover:opacity-70"
                              : "bg-transparent border-muted-foreground/40 hover:border-primary"
                          }`}
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

      {/* ── Class & Level ──────────────────────────────────────────────────── */}
      <Separator />
      <div className="flex items-center justify-between text-muted-foreground">
        <span>{character.name}</span>
        <span className="font-semibold text-foreground">
          {character.class} {character.level}
          {character.subclass ? ` · ${character.subclass}` : ""}
        </span>
      </div>
    </div>
  );
}
