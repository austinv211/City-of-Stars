import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { slotsForClass } from "./useSpellSlots";
import { isEpicBoonLevel } from "../data/leveling";
import { addMissingClassFeatures } from "../lib/classFeatures";
import type { CharacterWithScores, AbilityName } from "../types/character.types";

export { getAsiLevels, isAsiLevel, isEpicBoonLevel } from "../data/leveling";

export interface LevelUpOptions {
  hpGain: number;
  asiBonus?: Partial<Record<AbilityName, number>>;
  featName?: string | null;
}

export function useLevelUp(character: CharacterWithScores) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function commitLevelUp(opts: LevelUpOptions): Promise<void> {
    setLoading(true);
    setError(null);

    try {
      const newLevel = character.level + 1;
      const newHpMax = (character.hp_max ?? 0) + opts.hpGain;
      const newHpCurrent = Math.min(newHpMax, (character.hp_current ?? 0) + opts.hpGain);
      // Gain one hit die back, capped at the new level
      const newHitDiceCurrent = Math.min(
        (character.hit_dice_current ?? character.level - 1) + 1,
        newLevel
      );

      // Build features_notes update if feat chosen (Epic Boon at level 19)
      let featNotesUpdate: string | null | undefined;
      if (opts.featName) {
        const existing = character.features_notes ?? "";
        const label = isEpicBoonLevel(newLevel) ? "Epic Boon" : "Feat";
        const entry = `[${label} – Level ${newLevel}] ${opts.featName}`;
        featNotesUpdate = existing ? `${existing}\n${entry}` : entry;
      }

      const charUpdate: Record<string, unknown> = {
        level: newLevel,
        hp_max: newHpMax,
        hp_current: newHpCurrent,
        hit_dice_current: newHitDiceCurrent,
        level_up_pending: false,
      };
      if (featNotesUpdate !== undefined) charUpdate.features_notes = featNotesUpdate;

      // New HP propagates to active encounter participants via the
      // sync_character_to_participants DB trigger on characters.
      await supabase.from("characters").update(charUpdate).eq("id", character.id);

      // Record the structured class features granted at the new level.
      await addMissingClassFeatures(character.id, character.class, newLevel);

      // Apply ASI to ability scores. The 20 cap applies to the FINAL score
      // (base + background bonus), so cap there and store back the base value.
      if (opts.asiBonus && character.ability_scores) {
        const sc = character.ability_scores;
        const scoreUpdates: Record<string, number> = {};
        for (const [ability, bonus] of Object.entries(opts.asiBonus)) {
          if (bonus) {
            const a = ability as AbilityName;
            const bgBonus =
              (sc.background_bonus_primary === a ? 2 : 0) +
              (sc.background_bonus_secondary === a ? 1 : 0);
            const curBase = sc[a] ?? 10;
            const newFinal = Math.min(20, curBase + bgBonus + bonus);
            scoreUpdates[ability] = newFinal - bgBonus;
          }
        }
        if (Object.keys(scoreUpdates).length > 0) {
          await supabase
            .from("ability_scores")
            .update(scoreUpdates)
            .eq("character_id", character.id);
        }
      }

      // Sync spell slot totals for the new level (preserving expended counts).
      // Iterate ALL nine levels so totals that drop to 0 are cleared — Warlock
      // Pact Magic shifts its slots up to a higher level each tier, which would
      // otherwise leave a stale lower-level row behind.
      const newTotals = slotsForClass(character.class, newLevel, character.subclass);
      for (let i = 0; i < 9; i++) {
        const total = newTotals[i];
        const spellLevel = i + 1;
        const { data: existing } = await supabase
          .from("character_spell_slots")
          .select("id")
          .eq("character_id", character.id)
          .eq("spell_level", spellLevel)
          .maybeSingle();

        if (total > 0) {
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
        } else if (existing) {
          // Character no longer has slots at this level — remove the stale row
          await supabase
            .from("character_spell_slots")
            .delete()
            .eq("character_id", character.id)
            .eq("spell_level", spellLevel);
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
