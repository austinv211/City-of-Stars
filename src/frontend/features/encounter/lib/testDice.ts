/**
 * The deterministic-dice seam for the E2E suite.
 *
 * dice-box is WebGL physics with a settle timeout: slow and random by
 * construction, which no browser test can assert against. Under
 * VITE_DICE_MODE=deterministic (set only by .env.e2e) DiceProvider skips it
 * entirely and every die comes from here instead: first from a queue a test
 * loads with `window.__setDiceQueue([20, 7, 1])`, then from a seeded
 * generator, so even unscripted rolls repeat run to run.
 *
 * The flag is a build-time constant, so in every normal build this module's
 * hook is never installed and `deterministicDie` is never called.
 */

export const DETERMINISTIC_DICE = import.meta.env.VITE_DICE_MODE === "deterministic";

declare global {
  interface Window {
    /** E2E only: the next die faces to roll, in order. */
    __setDiceQueue?: (faces: number[]) => void;
  }
}

/** mulberry32: tiny, fast, and good enough to make dice repeatable. */
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createDiceSource(seed = 1) {
  let queue: number[] = [];
  const random = seeded(seed);
  return {
    setQueue(faces: number[]) {
      queue = [...faces];
    },
    /**
     * The next face for a die with `sides` sides. A queued face that cannot
     * be on this die (a 20 queued for a d6) is a test bug: it is skipped
     * with a console error rather than silently clamped.
     */
    next(sides: number): number {
      const face = queue.shift();
      if (face !== undefined) {
        if (Number.isInteger(face) && face >= 1 && face <= sides) return face;
        console.error(
          `[testDice] queued ${String(face)} is not a d${String(sides)} face`,
        );
      }
      return Math.floor(random() * sides) + 1;
    },
  };
}

const source = createDiceSource();

if (DETERMINISTIC_DICE && typeof window !== "undefined") {
  window.__setDiceQueue = (faces) => {
    source.setQueue(faces);
  };
}

export function deterministicDie(sides: number): number {
  return source.next(sides);
}
