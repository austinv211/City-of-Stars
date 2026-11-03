import { describe, expect, it } from "vitest";
import { clampHp, defaultStartHp, maxHpOf } from "./hp";

describe("clampHp", () => {
  it("keeps HP between 0 and max", () => {
    expect(clampHp(99, 28)).toBe(28);
    expect(clampHp(-3, 28)).toBe(0);
    expect(clampHp(12.7, 28)).toBe(12);
    expect(clampHp(Number.NaN, 28)).toBe(0);
  });
});

describe("defaultStartHp", () => {
  it("starts from the sheet's current HP", () => {
    expect(defaultStartHp({ hp_max: 28, hp_current: 21 })).toBe(21);
  });

  it("never starts above max, even when the sheet does", () => {
    expect(defaultStartHp({ hp_max: 28, hp_current: 40 })).toBe(28);
  });

  it("falls back to full HP, or to current HP without a max", () => {
    expect(defaultStartHp({ hp_max: 28, hp_current: null })).toBe(28);
    expect(maxHpOf({ hp_max: null, hp_current: 15 })).toBe(15);
  });
});
