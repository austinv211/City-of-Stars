import { describe, expect, it } from "vitest";
import { isoDay, relativeTo } from "./dates";

describe("isoDay", () => {
  it("uses the local date, not UTC", () => {
    expect(isoDay(new Date(2026, 0, 9, 23, 30))).toBe("2026-01-09");
  });
});

describe("relativeTo", () => {
  const now = new Date(2026, 10, 4, 18, 0);
  it("describes upcoming times", () => {
    expect(relativeTo(new Date(2026, 10, 4, 18, 20), now)).toBe("now");
    expect(relativeTo(new Date(2026, 10, 4, 21, 0), now)).toBe("in 3 hours");
    expect(relativeTo(new Date(2026, 10, 5, 19, 0), now)).toBe("tomorrow");
    expect(relativeTo(new Date(2026, 10, 9, 19, 0), now)).toBe("in 5 days");
    expect(relativeTo(new Date(2026, 10, 3, 19, 0), now)).toBe("already started");
  });
});
