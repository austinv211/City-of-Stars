import { describe, expect, it } from "vitest";
import { hpFraction } from "./attack";
import { bannerImage, initialsOf, thumbImage } from "./combatantImage";

describe("bannerImage / thumbImage", () => {
  const both = { portrait_url: "face.png", art_url: "art.png" };

  it("puts full art on banners and the portrait on thumbnails", () => {
    expect(bannerImage(both)).toBe("art.png");
    expect(thumbImage(both)).toBe("face.png");
  });

  it("falls back to whichever picture there is", () => {
    expect(bannerImage({ portrait_url: "face.png", art_url: null })).toBe("face.png");
    expect(thumbImage({ portrait_url: null, art_url: "art.png" })).toBe("art.png");
    expect(bannerImage({ portrait_url: null, art_url: null })).toBeNull();
  });
});

describe("initialsOf", () => {
  it("takes first and last word, ignoring a DM's (Stat block)", () => {
    expect(initialsOf("Isolde Brightwater")).toBe("IB");
    expect(initialsOf("Grizzle (Goblin)")).toBe("GR");
    expect(initialsOf("Goblin A")).toBe("GA");
    expect(initialsOf("  ")).toBe("?");
  });
});

describe("hpFraction", () => {
  it("is clamped to 0..1 and 0 without a max", () => {
    expect(hpFraction({ hp_current: 7, hp_max: 14 })).toBe(0.5);
    expect(hpFraction({ hp_current: -3, hp_max: 14 })).toBe(0);
    expect(hpFraction({ hp_current: 20, hp_max: 14 })).toBe(1);
    expect(hpFraction({ hp_current: 5, hp_max: 0 })).toBe(0);
  });
});
