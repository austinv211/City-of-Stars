import { describe, expect, it } from "vitest";
import { bestDays, calendarDays, nextStatus, summarize, type AvailabilityMark } from "./calendar";

describe("calendarDays", () => {
  it("starts on the Monday of the current week and covers whole weeks", () => {
    const days = calendarDays(new Date(2026, 10, 5), 2); // Thursday 5 Nov 2026
    expect(days).toHaveLength(14);
    expect(days[0]).toBe("2026-11-02");
    expect(days[13]).toBe("2026-11-15");
  });

  it("handles a Sunday and month ends", () => {
    expect(calendarDays(new Date(2026, 10, 1), 1)[0]).toBe("2026-10-26");
  });
});

describe("nextStatus", () => {
  it("cycles through every state back to unset", () => {
    expect(nextStatus(undefined)).toBe("yes");
    expect(nextStatus("yes")).toBe("maybe");
    expect(nextStatus("maybe")).toBe("no");
    expect(nextStatus("no")).toBeNull();
  });
});

describe("bestDays", () => {
  const marks: AvailabilityMark[] = [
    { user_id: "a", day: "2026-11-07", status: "yes" },
    { user_id: "b", day: "2026-11-07", status: "yes" },
    { user_id: "a", day: "2026-11-08", status: "yes" },
    { user_id: "b", day: "2026-11-08", status: "no" },
    { user_id: "a", day: "2026-11-09", status: "maybe" },
    { user_id: "b", day: "2026-11-09", status: "yes" },
    { user_id: "a", day: "2026-11-01", status: "yes" },
  ];

  it("ranks days everyone can make and skips past days and vetoed days", () => {
    expect(bestDays(summarize(marks), "2026-11-04").map((d) => d.day)).toEqual(["2026-11-07", "2026-11-09"]);
  });
});
