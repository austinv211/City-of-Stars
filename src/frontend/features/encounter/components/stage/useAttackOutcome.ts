import { useState } from "react";
import type { DamageResult } from "../../hooks/useEncounterParticipants";
import type { TargetInfo } from "../../lib/attack";

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
 * what they mean. Each card keeps its own: two attacks in one turn must not
 * overwrite each other's verdicts.
 *
 * The target is taken when the attack is rolled, so changing targets later
 * doesn't re-judge an old roll or apply its damage to someone else. A roll
 * made with no target picks up the next one chosen.
 */
export function useAttackOutcome(current: TargetInfo | null) {
  const [attack, setAttack] = useState<Rolled | null>(null);
  const [damage, setDamage] = useState<Dealt | null>(null);
  const [applied, setApplied] = useState<DamageResult | null>(null);
  const [aimedAt, setAimedAt] = useState<TargetInfo | null>(null);

  return {
    attack,
    damage,
    applied,
    target: aimedAt ?? current,
    /** A fresh attack starts a fresh resolution. */
    aim(roll: Promise<number>, modifier: number) {
      void roll.then((total) => {
        setAttack({ total, modifier });
        setAimedAt(current);
        setDamage(null);
        setApplied(null);
      });
    },
    deal(roll: Promise<number>, crit: boolean) {
      void roll.then((total) => {
        setDamage({ total, crit });
        // Damage with no attack roll first (a save spell) is aimed now.
        if (!attack) setAimedAt(current);
        setApplied(null);
      });
    },
    setApplied,
  };
}

export type AttackOutcomeState = ReturnType<typeof useAttackOutcome>;
