import { describe, expect, it } from "vitest";
import { isoWeekKey, previousWeek, weeklyStreakLength } from "../src/lib/weeks";

describe("isoWeekKey", () => {
  it("puts Thursday 1 Jan 2026 in 2026-W01", () => {
    expect(isoWeekKey(new Date(2026, 0, 1))).toBe("2026-W01");
  });

  it("puts Monday 5 Jan 2026 in 2026-W02", () => {
    expect(isoWeekKey(new Date(2026, 0, 5))).toBe("2026-W02");
  });

  it("puts Monday 29 Dec 2025 in 2026-W01", () => {
    expect(isoWeekKey(new Date(2025, 11, 29))).toBe("2026-W01");
  });
});

describe("previousWeek", () => {
  it("steps from 2026-W01 back to 2025-W52", () => {
    expect(previousWeek("2026-W01")).toBe("2025-W52");
  });
});

describe("weeklyStreakLength", () => {
  it("is 0 when this week is open and nothing is completed", () => {
    expect(weeklyStreakLength([], "2026-W10")).toBe(0);
  });

  it("is 1 when only this week is completed", () => {
    expect(weeklyStreakLength(["2026-W10"], "2026-W10")).toBe(1);
  });

  it("keeps the streak when this week is not done yet", () => {
    expect(weeklyStreakLength(["2026-W10", "2026-W11"], "2026-W12")).toBe(2);
  });

  it("resets to 0 after a missed week", () => {
    expect(weeklyStreakLength(["2026-W10", "2026-W11"], "2026-W13")).toBe(0);
  });

  it("starts a new streak at 1 when this week is done after a miss", () => {
    expect(weeklyStreakLength(["2026-W10", "2026-W11", "2026-W13"], "2026-W13")).toBe(1);
  });
});
