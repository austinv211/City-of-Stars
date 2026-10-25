import { describe, expect, it, vi } from "vitest";
import { createDiceSource } from "./testDice";

describe("createDiceSource", () => {
  it("rolls queued faces first, in order", () => {
    const dice = createDiceSource();
    dice.setQueue([20, 7, 1]);
    expect([dice.next(20), dice.next(8), dice.next(20)]).toEqual([20, 7, 1]);
  });

  it("repeats the same unscripted rolls for the same seed", () => {
    const a = createDiceSource(42);
    const b = createDiceSource(42);
    const roll = (d: ReturnType<typeof createDiceSource>) =>
      Array.from({ length: 10 }, () => d.next(20));
    expect(roll(a)).toEqual(roll(b));
  });

  it("stays on the die", () => {
    const dice = createDiceSource(7);
    for (let i = 0; i < 500; i++) {
      const face = dice.next(6);
      expect(face).toBeGreaterThanOrEqual(1);
      expect(face).toBeLessThanOrEqual(6);
    }
  });

  it("skips, loudly, a queued face the die cannot show", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const dice = createDiceSource();
    dice.setQueue([20, 3]);
    const first = dice.next(6);
    expect(first).toBeGreaterThanOrEqual(1);
    expect(first).toBeLessThanOrEqual(6);
    expect(error).toHaveBeenCalledOnce();
    expect(dice.next(6)).toBe(3);
    error.mockRestore();
  });

  it("replaces, not appends to, the queue", () => {
    const dice = createDiceSource();
    dice.setQueue([1, 2]);
    dice.setQueue([5]);
    expect(dice.next(20)).toBe(5);
  });
});
