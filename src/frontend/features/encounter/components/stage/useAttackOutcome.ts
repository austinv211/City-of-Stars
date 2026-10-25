import { useState } from "react";
import type { DamageResult } from "../../hooks/useEncounterParticipants";

export interface Rolled {
  total: number;
  modifier: number;
}

interface Dealt {
  total: number;
  crit: boolean;
}

/**
 * The last to-hit and damage results of one attack card, so the card can say
 * what they mean against the current target. Each card keeps its own: two
 * different attacks in one turn must not overwrite each other's verdicts.
 */
export function useAttackOutcome() {
  const [attack, setAttack] = useState<Rolled | null>(null);
  const [damage, setDamage] = useState<Dealt | null>(null);
  const [applied, setApplied] = useState<DamageResult | null>(null);

  return {
    attack,
    damage,
    applied,
    /** A fresh attack starts a fresh resolution. */
    aim(roll: Promise<number>, modifier: number) {
      void roll.then((total) => {
        setAttack({ total, modifier });
        setDamage(null);
        setApplied(null);
      });
    },
    deal(roll: Promise<number>, crit: boolean) {
      void roll.then((total) => {
        setDamage({ total, crit });
        setApplied(null);
      });
    },
    setApplied,
  };
}

export type AttackOutcomeState = ReturnType<typeof useAttackOutcome>;
