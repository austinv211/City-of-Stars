import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { slotsForClass } from "./useSpellSlots";
import type { CharacterWithScores, AbilityName } from "../types/character.types";

export interface LevelUpOptions {
  hpGain: number;
  asiBonus?: Partial<Record<AbilityName, number>>;
  featName?: string | null;
}

// ASI levels per class (2014 SRD)
const ASI_LEVELS: Record<string, number[]> = {
  Fighter: [4, 6, 8, 12, 14, 16, 19],
  Rogue:   [4, 8, 10, 12, 16, 18],
};
const DEFAULT_ASI_LEVELS = [4, 8, 12, 16, 19];

export function getAsiLevels(className: string): number[] {
  return ASI_LEVELS[className] ?? DEFAULT_ASI_LEVELS;
}

export function isAsiLevel(className: string, level: number): boolean {
  return getAsiLevels(className).includes(level);
}

export function useLevelUp(character: CharacterWithScores) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function commitLevelUp(opts: LevelUpOptions): Promise<void> {
    setLoading(true);
    setError(null);

    try {
      const newHpMax = (character.hp_max ?? 0) + opts.hpGain;
      const newHpCurrent = Math.min(newHpMax, (character.hp_current ?? 0) + opts.hpGain);
      // Gain one hit die back (max = current level after DM's RPC already incremented it)
      const newHitDiceCurrent = Math.min(
        (character.hit_dice_current ?? character.level - 1) + 1,
        character.level
      );

      // Build features_notes update if feat chosen
      let featNotesUpdate: string | null | undefined;
      if (opts.featName) {
        const existing = character.features_notes ?? "";
        featNotesUpdate = existing
          ? `${existing}\n[Feat – Level ${character.level}] ${opts.featName}`
          : `[Feat – Level ${character.level}] ${opts.featName}`;
      }

      const charUpdate: Record<string, unknown> = {
        hp_max: newHpMax,
        hp_current: newHpCurrent,
        hit_dice_current: newHitDiceCurrent,
        level_up_pending: false,
      };
      if (featNotesUpdate !== undefined) charUpdate.features_notes = featNotesUpdate;

      await supabase.from("characters").update(charUpdate).eq("id", character.id);

      // Apply ASI to ability scores
      if (opts.asiBonus && character.ability_scores) {
        const scoreUpdates: Record<string, number> = {};
        for (const [ability, bonus] of Object.entries(opts.asiBonus)) {
          if (bonus) {
            const cur = character.ability_scores[ability as AbilityName] ?? 10;
            scoreUpdates[ability] = Math.min(20, cur + bonus);
          }
        }
        if (Object.keys(scoreUpdates).length > 0) {
          await supabase
            .from("ability_scores")
            .update(scoreUpdates)
            .eq("character_id", character.id);
        }
      }

      // Update spell slot totals for the new level (don't reset expended)
      const newTotals = slotsForClass(character.class, character.level);
      for (let i = 0; i < newTotals.length; i++) {
        const total = newTotals[i];
        const spellLevel = i + 1;
        if (total > 0) {
          // Update total only on conflict; insert with expended=0 if new row
          const { data: existing } = await supabase
            .from("character_spell_slots")
            .select("id")
            .eq("character_id", character.id)
            .eq("spell_level", spellLevel)
            .maybeSingle();

          if (existing) {
            await supabase
              .from("character_spell_slots")
              .update({ slots_total: total })
              .eq("character_id", character.id)
              .eq("spell_level", spellLevel);
          } else {
            await supabase.from("character_spell_slots").insert({
              character_id: character.id,
              spell_level: spellLevel,
              slots_total: total,
              slots_expended: 0,
            });
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      throw err;
    } finally {
      setLoading(false);
    }
  }

  return { commitLevelUp, loading, error };
}
