import { supabase } from "@/lib/supabase";
import type { DiceRollBroadcast } from "../types/encounter.types";

function cryptoRoll(sides: number): number {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return (array[0] % sides) + 1;
}

export interface RollOptions {
  campaignId: string;
  encounterId: string | null;
  characterName: string;
  diceType: string;
  sides: number;
  modifier: number;
  rollType: string;
}

export function useDiceRolls() {
  async function roll(opts: RollOptions): Promise<DiceRollBroadcast> {
    const result = cryptoRoll(opts.sides);
    const total = result + opts.modifier;

    const broadcast: DiceRollBroadcast = {
      characterName: opts.characterName,
      diceType: opts.diceType,
      result,
      modifier: opts.modifier,
      total,
      rollType: opts.rollType,
    };

    // Broadcast first (fast) — animation fires on all clients
    await supabase.channel(`dice:${opts.campaignId}`).send({
      type: "broadcast",
      event: "roll",
      payload: broadcast,
    });

    // Persist to DB (non-blocking)
    supabase.from("dice_rolls").insert({
      campaign_id: opts.campaignId,
      encounter_id: opts.encounterId,
      character_name: opts.characterName,
      dice_type: opts.diceType,
      result,
      modifier: opts.modifier,
      total,
      roll_type: opts.rollType,
    });

    return broadcast;
  }

  return { roll };
}
