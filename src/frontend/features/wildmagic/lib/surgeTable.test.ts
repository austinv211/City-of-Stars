import { describe, expect, it } from "vitest";
import { coverage, findOverlaps, formatRange, parseSurgeLines } from "./surgeTable";

describe("formatRange", () => {
  it("prints d100 faces", () => {
    expect(formatRange(1, 2)).toBe("01–02");
    expect(formatRange(7, 7)).toBe("07");
    expect(formatRange(99, 100)).toBe("99–00");
    expect(formatRange(null, null)).toBe("—");
  });
});

describe("parseSurgeLines", () => {
  it("reads ranges, single rolls and 00", () => {
    const { drafts, skipped } = parseSurgeLines("01-02 Your hair turns blue.\n7. A frog appears\n99–00 You glow");
    expect(skipped).toEqual([]);
    expect(drafts.map((d) => [d.roll_min, d.roll_max])).toEqual([[1, 2], [7, 7], [99, 100]]);
    expect(drafts[1].name).toBe("A frog appears");
  });

  it("uses the first sentence as the name and keeps the full text", () => {
    const [d] = parseSurgeLines("03-04 You cast fireball centred on yourself. Everyone nearby is unhappy.").drafts;
    expect(d.name).toBe("You cast fireball centred on yourself.");
    expect(d.description).toBe("You cast fireball centred on yourself. Everyone nearby is unhappy.");
  });

  it("splits explicit name | description columns", () => {
    const [d] = parseSurgeLines("05 | Butterflies | A cloud of butterflies surrounds you.").drafts;
    expect(d).toMatchObject({ name: "Butterflies", description: "A cloud of butterflies surrounds you." });
  });

  it("skips lines without a valid roll, by line number", () => {
    const { drafts, skipped } = parseSurgeLines("Wild Magic Table\n\n01 Ok\n150 Too high\n20-10 Backwards");
    expect(drafts).toHaveLength(1);
    expect(skipped).toEqual([1, 4, 5]);
  });
});

describe("findOverlaps / coverage", () => {
  const table = [
    { roll_min: 1, roll_max: 10, name: "A" },
    { roll_min: 10, roll_max: 20, name: "B" },
    { roll_min: null, roll_max: null, name: "Hand-picked" },
  ];

  it("flags ranges that share a roll", () => {
    expect(findOverlaps(table)).toEqual([["A", "B"]]);
  });

  it("counts covered faces once", () => {
    expect(coverage(table)).toBe(20);
  });
});
