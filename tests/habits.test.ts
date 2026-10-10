import { describe, expect, it } from "vitest";
import type { Habit } from "../src/lib/habit-store";
import { localDateKey } from "../src/lib/dates";
import { toggleCompletion } from "../src/lib/toggle-completion";

const read: Habit = {
  id: "habit-read",
  name: "Read",
  cadence: "daily",
  createdAt: "2026-10-05T12:00:00.000Z",
  completions: ["2026-10-05"],
};

describe("localDateKey", () => {
  it("uses the local calendar day", () => {
    expect(localDateKey(new Date(2026, 9, 5, 23, 30))).toBe("2026-10-05");
  });
});

describe("toggleCompletion", () => {
  it("adds today when it is not completed yet", () => {
    expect(toggleCompletion(read, "2026-10-06").completions).toEqual([
      "2026-10-05",
      "2026-10-06",
    ]);
  });

  it("removes today when it is already completed", () => {
    expect(toggleCompletion(read, "2026-10-05").completions).toEqual([]);
  });
});
