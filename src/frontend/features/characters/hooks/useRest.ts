import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { abilityModifier, finalAbilityScores } from "../types/character.types";
import { CLASSES } from "../data/dnd2024.constants";
import type { CharacterWithScores } from "../types/character.types";

export function useRest(
  character: CharacterWithScores,
  onSlotsLongRest: () => Promise<void>,
  onSlotsShortRest?: () => Promise<void>,
) {
  const [resting, setResting] = useState(false);

  const scores = character.ability_scores;
  const base = scores ?? { strength:10, dexterity:10, constitution:10, intelligence:10, wisdom:10, charisma:10 };
  const final = finalAbilityScores(base, scores?.background_bonus_primary, scores?.background_bonus_secondary);
  const conMod = abilityModifier(final.constitution);
  const classData = CLASSES.find((c) => c.name === character.class);
  const hitDie = classData?.hitDie ?? 8;
  const isWarlock = character.class.toLowerCase() === "warlock";

  // 5e 2014: Long rest restores HP, half of total hit dice (min 1), all spell slots,
  // death saves, and (homebrew) Will of the Void gauge.
  async function longRest(): Promise<void> {
    setResting(true);
    const hitDiceRecovered = Math.max(1, Math.floor(character.level / 2));
    const newHitDiceCurrent = Math.min(
      character.level,
      (character.hit_dice_current ?? 0) + hitDiceRecovered,
    );
    await supabase.from("characters").update({
      hp_current: character.hp_max,
      hit_dice_current: newHitDiceCurrent,
      death_save_successes: 0,
      death_save_failures: 0,
      will_of_void: 0,
    }).eq("id", character.id);
    await onSlotsLongRest();
    setResting(false);
  }

  // 5e 2014: Short rest — spend hit dice to heal. Warlocks also recover all spell slots.
  // Returns total HP healed.
  async function shortRest(diceToSpend: number): Promise<number> {
    if (diceToSpend <= 0) return 0;
    setResting(true);

    let healed = 0;
    const currentHitDice = character.hit_dice_current ?? 0;
    const toSpend = Math.min(diceToSpend, currentHitDice);
    for (let i = 0; i < toSpend; i++) {
      const roll = Math.floor(Math.random() * hitDie) + 1;
      healed += Math.max(1, roll + conMod);
    }

    const newHp = Math.min(character.hp_max ?? 0, (character.hp_current ?? 0) + healed);
    const newHitDiceCurrent = Math.max(0, currentHitDice - toSpend);

    await supabase.from("characters").update({
      hp_current: newHp,
      hit_dice_current: newHitDiceCurrent,
    }).eq("id", character.id);

    // Warlocks recover all spell slots on short rest (PHB p. 107)
    if (isWarlock && onSlotsShortRest) {
      await onSlotsShortRest();
    }

    setResting(false);
    return healed;
  }

  return { longRest, shortRest, resting, hitDie, conMod };
}
