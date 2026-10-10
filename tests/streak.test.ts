import { describe, expect, it } from "vitest";
import { streakLength } from "../src/lib/streak";

describe("streakLength", () => {
  it("is 0 when nothing is completed and today is still open", () => {
    expect(streakLength([], "2026-10-05")).toBe(0);
  });

  it("is 1 when only today is completed", () => {
    expect(streakLength(["2026-10-05"], "2026-10-05")).toBe(1);
  });

  it("keeps the streak when today is not done yet", () => {
    expect(streakLength(["2026-10-05", "2026-10-06"], "2026-10-07")).toBe(2);
  });

  it("resets to 0 after a missed day", () => {
    expect(streakLength(["2026-10-05", "2026-10-06"], "2026-10-08")).toBe(0);
  });

  it("starts a new streak at 1 when today is done after a miss", () => {
    expect(
      streakLength(["2026-10-05", "2026-10-06", "2026-10-08"], "2026-10-08"),
    ).toBe(1);
  });

  it("counts only the days after an earlier miss", () => {
    expect(streakLength(["2026-10-05", "2026-10-07"], "2026-10-07")).toBe(1);
  });

  it("counts each completed day once when the list has duplicates", () => {
    expect(streakLength(["2026-10-05", "2026-10-05"], "2026-10-05")).toBe(1);
  });

  it("counts an unsorted list the same as a sorted one", () => {
    expect(streakLength(["2026-10-06", "2026-10-05"], "2026-10-07")).toBe(2);
  });

  it("ignores a completion dated after today", () => {
    expect(streakLength(["2026-10-06"], "2026-10-05")).toBe(0);
  });

  it("keeps a streak across the new year when today is not done yet", () => {
    expect(streakLength(["2025-12-31", "2026-01-01"], "2026-01-02")).toBe(2);
  });
});
