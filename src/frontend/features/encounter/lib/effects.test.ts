import { describe, expect, it } from "vitest";
import { describeExpiry, possessive } from "./effects";

const names: Record<string, string> = { lyra: "Lyra", me: "you", ness: "Ness" };
const nameOf = (id: string | null) => (id ? (names[id] ?? "?") : "—");

const effect = (over: Partial<Parameters<typeof describeExpiry>[0]> = {}) => ({
  expiry: "manual" as const,
  rounds_remaining: null,
  source_participant_id: "lyra",
  target_participant_id: "ness",
  ...over,
});

describe("describeExpiry", () => {
  it("counts rounds, singular and plural", () => {
    expect(
      describeExpiry(effect({ expiry: "rounds", rounds_remaining: 1 }), nameOf),
    ).toBe("1 round");
    expect(
      describeExpiry(effect({ expiry: "rounds", rounds_remaining: 9 }), nameOf),
    ).toBe("9 rounds");
  });

  it("names whose turn ends it", () => {
    expect(
      describeExpiry(effect({ expiry: "start_of_source_next_turn" }), nameOf),
    ).toBe("until Lyra's next turn");
    expect(describeExpiry(effect({ expiry: "end_of_target_next_turn" }), nameOf)).toBe(
      "until end of Ness' next turn",
    );
  });

  it("speaks to the viewer about their own concentration", () => {
    expect(
      describeExpiry(
        effect({ expiry: "concentration", source_participant_id: "me" }),
        nameOf,
      ),
    ).toBe("your concentration");
  });

  it("says plainly when only a person can end it", () => {
    expect(describeExpiry(effect(), nameOf)).toBe("until removed");
  });
});

describe("possessive", () => {
  it.each([
    ["Lyra", "Lyra's"],
    ["Ness", "Ness'"],
    ["you", "your"],
    ["You", "Your"],
  ])("%s -> %s", (name, expected) => {
    expect(possessive(name)).toBe(expected);
  });
});
