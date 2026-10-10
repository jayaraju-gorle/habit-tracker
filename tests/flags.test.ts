import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { habitTypes, readWeeklyHabitsFlag } from "../src/lib/flags";

describe("readWeeklyHabitsFlag", () => {
  it("is off when the shipped flags file says false", () => {
    const shipped = JSON.parse(readFileSync("public/flags.json", "utf8"));
    expect(readWeeklyHabitsFlag(shipped)).toBe(false);
  });

  it("is on only when weeklyHabits is true", () => {
    expect(readWeeklyHabitsFlag({ weeklyHabits: true })).toBe(true);
  });

  it("stays off for a missing, string, or garbage payload", () => {
    expect(readWeeklyHabitsFlag(null)).toBe(false);
    expect(readWeeklyHabitsFlag({ weeklyHabits: "true" })).toBe(false);
    expect(readWeeklyHabitsFlag([])).toBe(false);
  });
});

describe("habitTypes", () => {
  it("offers only daily when the flag is off", () => {
    expect(habitTypes(false)).toEqual(["daily"]);
  });

  it("offers daily and weekly when the flag is on", () => {
    expect(habitTypes(true)).toEqual(["daily", "weekly"]);
  });
});
