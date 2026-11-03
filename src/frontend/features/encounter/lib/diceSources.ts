import type DiceBox from "@3d-dice/dice-box";
import { dice } from "../components/stage/combatantStats";
import type { DiceSource } from "./poolDice";
import { DETERMINISTIC_DICE, deterministicDie } from "./testDice";

/** A fair die from the platform RNG (or the e2e build's scripted faces). */
function cryptoRoll(sides: number): number {
  if (DETERMINISTIC_DICE) return deterministicDie(sides);
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return (array[0] % sides) + 1;
}

export const cryptoSource: DiceSource = (pool) =>
  Promise.resolve(pool.map(({ sides, count }) => Array.from({ length: count }, () => cryptoRoll(sides))));

/** Faces from the 3D dice, grouped like the pool; any that didn't settle are re-rolled. */
export function boxSource(box: InstanceType<typeof DiceBox>): DiceSource {
  return async (pool) => {
    const results = await box.roll(pool.map(({ count, sides }) => dice(count, sides)));
    const bySides = new Map<number, number[]>();
    for (const r of results) {
      bySides.set(r.sides, [...(bySides.get(r.sides) ?? []), safeValue(r.value, r.sides)]);
    }
    return pool.map(({ sides, count }) => {
      const faces = (bySides.get(sides) ?? []).splice(0, count);
      while (faces.length < count) faces.push(cryptoRoll(sides));
      return faces;
    });
  };
}

// Validates a value returned by DiceBox. Returns cryptoRoll fallback for any
// NaN/undefined/out-of-range result (can occur when settle timeout fires before
// a die comes to rest, or when DiceBox uses two d10s to simulate a d100).
function safeValue(v: unknown, sides: number): number {
  if (typeof v === "number" && Number.isFinite(v) && v >= 1 && v <= sides) return v;
  return cryptoRoll(sides);
}
