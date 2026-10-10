import { describe, expect, it } from "vitest";
import { HABIT_STORAGE_KEY, type HabitStore } from "../src/lib/habit-store";
import { loadHabits, saveHabits } from "../src/lib/storage";

function memoryStorage(initial: Record<string, string> = {}) {
  const data = { ...initial };
  return {
    data,
    getItem(key: string) {
      return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null;
    },
    setItem(key: string, value: string) {
      data[key] = value;
    },
  };
}

const readHabit: HabitStore["habits"][number] = {
  id: "habit-read",
  name: "Read",
  cadence: "daily",
  createdAt: "2026-10-05T12:00:00.000Z",
  completions: ["2026-10-05"],
};

describe("loadHabits", () => {
  it("returns an empty v1 store when the key is missing and writes nothing", () => {
    const storage = memoryStorage();

    const result = loadHabits(storage);

    expect(result).toEqual({
      status: "ready",
      store: { version: 1, habits: [] },
      migratedFrom: null,
    });
    expect(storage.data).toEqual({});
  });

  it("returns an empty v1 store when the stored value is blank", () => {
    const storage = memoryStorage({ [HABIT_STORAGE_KEY]: "   " });

    expect(loadHabits(storage)).toEqual({
      status: "ready",
      store: { version: 1, habits: [] },
      migratedFrom: null,
    });
  });

  it("returns a valid v1 store with duplicate completion dates collapsed and sorted", () => {
    const storage = memoryStorage({
      [HABIT_STORAGE_KEY]: JSON.stringify({
        version: 1,
        habits: [{ ...readHabit, completions: ["2026-10-06", "2026-10-05", "2026-10-06"] }],
      }),
    });

    const result = loadHabits(storage);

    expect(result).toEqual({
      status: "ready",
      migratedFrom: null,
      store: {
        version: 1,
        habits: [{ ...readHabit, completions: ["2026-10-05", "2026-10-06"] }],
      },
    });
  });

  it("migrates a version 0 store to daily habits without writing", () => {
    const storage = memoryStorage({
      [HABIT_STORAGE_KEY]: JSON.stringify({
        version: 0,
        habits: [
          {
            name: "  Read  ",
            completedDates: ["2026-10-06", "2026-10-05", "2026-10-05", "nope"],
          },
          { name: "   ", completedDates: ["2026-10-05"] },
        ],
      }),
    });
    const raw = storage.data[HABIT_STORAGE_KEY];

    const result = loadHabits(storage, {
      createId: () => "habit-read",
      now: new Date("2026-10-10T00:00:00.000Z"),
    });

    expect(result).toEqual({
      status: "ready",
      migratedFrom: 0,
      store: {
        version: 1,
        habits: [
          {
            id: "habit-read",
            name: "Read",
            cadence: "daily",
            createdAt: "2026-10-05T00:00:00.000Z",
            completions: ["2026-10-05", "2026-10-06"],
          },
        ],
      },
    });
    expect(storage.data[HABIT_STORAGE_KEY]).toBe(raw);
  });

  it("migrates a versionless habits array as version 0", () => {
    const storage = memoryStorage({
      [HABIT_STORAGE_KEY]: JSON.stringify({
        habits: [{ name: "Walk", completedDates: [] }],
      }),
    });

    const result = loadHabits(storage, {
      createId: () => "habit-walk",
      now: new Date("2026-10-10T15:00:00.000Z"),
    });

    expect(result).toEqual({
      status: "ready",
      migratedFrom: 0,
      store: {
        version: 1,
        habits: [
          {
            id: "habit-walk",
            name: "Walk",
            cadence: "daily",
            createdAt: "2026-10-10T15:00:00.000Z",
            completions: [],
          },
        ],
      },
    });
  });

  it("reports a future version and leaves the bytes in place", () => {
    const payload = JSON.stringify({ version: 2, habits: [] });
    const storage = memoryStorage({ [HABIT_STORAGE_KEY]: payload });

    expect(loadHabits(storage)).toEqual({ status: "future-version", found: 2 });
    expect(storage.data[HABIT_STORAGE_KEY]).toBe(payload);
  });

  it("reports corrupt JSON and leaves the bytes in place", () => {
    const storage = memoryStorage({ [HABIT_STORAGE_KEY]: "{not json" });

    expect(loadHabits(storage)).toEqual({ status: "corrupt" });
    expect(storage.data[HABIT_STORAGE_KEY]).toBe("{not json");
  });

  it("reports a v1 store with an empty habit name as corrupt", () => {
    const payload = JSON.stringify({
      version: 1,
      habits: [{ ...readHabit, name: "  " }],
    });
    const storage = memoryStorage({ [HABIT_STORAGE_KEY]: payload });

    expect(loadHabits(storage)).toEqual({ status: "corrupt" });
    expect(storage.data[HABIT_STORAGE_KEY]).toBe(payload);
  });

  it("keeps a markup-looking name as plain text and drops unknown fields", () => {
    const payload =
      '{"version":1,"habits":[{"id":"habit-read","name":"<img src=x onerror=\\"alert(1)\\">","cadence":"daily","createdAt":"2026-10-05T12:00:00.000Z","completions":["2026-10-05"],"html":"<script>alert(1)</script>","__proto__":{"admin":true}}]}';
    const storage = memoryStorage({ [HABIT_STORAGE_KEY]: payload });

    const result = loadHabits(storage);

    expect(result).toEqual({
      status: "ready",
      migratedFrom: null,
      store: {
        version: 1,
        habits: [{ ...readHabit, name: '<img src=x onerror="alert(1)">' }],
      },
    });
    expect(Object.prototype).not.toHaveProperty("admin");
  });

  it("rejects a name with a control character and leaves the bytes in place", () => {
    const payload = JSON.stringify({
      version: 1,
      habits: [{ ...readHabit, name: "Read\n<script>" }],
    });
    const storage = memoryStorage({ [HABIT_STORAGE_KEY]: payload });

    expect(loadHabits(storage)).toEqual({ status: "corrupt" });
    expect(storage.data[HABIT_STORAGE_KEY]).toBe(payload);
  });

  it("rejects an id that is not a safe token", () => {
    const payload = JSON.stringify({
      version: 1,
      habits: [{ ...readHabit, id: '"><img src=x>' }],
    });
    const storage = memoryStorage({ [HABIT_STORAGE_KEY]: payload });

    expect(loadHabits(storage)).toEqual({ status: "corrupt" });
    expect(storage.data[HABIT_STORAGE_KEY]).toBe(payload);
  });

  it("rejects duplicate ids", () => {
    const payload = JSON.stringify({
      version: 1,
      habits: [readHabit, { ...readHabit, name: "Walk" }],
    });
    const storage = memoryStorage({ [HABIT_STORAGE_KEY]: payload });

    expect(loadHabits(storage)).toEqual({ status: "corrupt" });
    expect(storage.data[HABIT_STORAGE_KEY]).toBe(payload);
  });

  it("rejects a completion that is not a calendar date", () => {
    const payload = JSON.stringify({
      version: 1,
      habits: [{ ...readHabit, completions: ["2026-10-05", "<script>"] }],
    });
    const storage = memoryStorage({ [HABIT_STORAGE_KEY]: payload });

    expect(loadHabits(storage)).toEqual({ status: "corrupt" });
    expect(storage.data[HABIT_STORAGE_KEY]).toBe(payload);
  });

  it("rejects more than 100 habits", () => {
    const habits = Array.from({ length: 101 }, (_, index) => ({
      ...readHabit,
      id: `habit-${index}`,
    }));
    const payload = JSON.stringify({ version: 1, habits });
    const storage = memoryStorage({ [HABIT_STORAGE_KEY]: payload });

    expect(loadHabits(storage)).toEqual({ status: "corrupt" });
    expect(storage.data[HABIT_STORAGE_KEY]).toBe(payload);
  });

  it("rejects more than 2000 completion entries", () => {
    const payload = JSON.stringify({
      version: 1,
      habits: [{ ...readHabit, completions: Array.from({ length: 2001 }, () => "2026-10-05") }],
    });
    const storage = memoryStorage({ [HABIT_STORAGE_KEY]: payload });

    expect(loadHabits(storage)).toEqual({ status: "corrupt" });
    expect(storage.data[HABIT_STORAGE_KEY]).toBe(payload);
  });

  it("rejects a payload larger than 100000 characters before using it", () => {
    const payload = `{"version":1,"habits":[]}${" ".repeat(100000)}`;
    const storage = memoryStorage({ [HABIT_STORAGE_KEY]: payload });

    expect(loadHabits(storage)).toEqual({ status: "corrupt" });
    expect(storage.data[HABIT_STORAGE_KEY]).toBe(payload);
  });

  it("reports unavailable when reading throws", () => {
    const storage = {
      getItem() {
        throw new Error("blocked");
      },
      setItem() {
        throw new Error("blocked");
      },
    };

    expect(loadHabits(storage)).toEqual({ status: "unavailable" });
  });
});

describe("saveHabits", () => {
  it("writes the v1 store and returns the saved value", () => {
    const storage = memoryStorage();
    const store: HabitStore = { version: 1, habits: [readHabit] };

    expect(saveHabits(storage, store)).toEqual({ status: "saved", store });
    expect(storage.data[HABIT_STORAGE_KEY]).toBe(JSON.stringify(store));
  });

  it("sorts completions and trims the name before writing", () => {
    const storage = memoryStorage();

    const result = saveHabits(storage, {
      version: 1,
      habits: [
        {
          ...readHabit,
          name: "  Read  ",
          completions: ["2026-10-07", "2026-10-05", "2026-10-07"],
        },
      ],
    });

    expect(result).toEqual({
      status: "saved",
      store: {
        version: 1,
        habits: [{ ...readHabit, completions: ["2026-10-05", "2026-10-07"] }],
      },
    });
  });

  it("rejects an empty name and leaves the previous value in place", () => {
    const previous = JSON.stringify({ version: 1, habits: [] });
    const storage = memoryStorage({ [HABIT_STORAGE_KEY]: previous });

    const result = saveHabits(storage, {
      version: 1,
      habits: [{ ...readHabit, name: "   " }],
    });

    expect(result).toEqual({
      status: "invalid",
      message: "Habit name must be 1–80 characters.",
    });
    expect(storage.data[HABIT_STORAGE_KEY]).toBe(previous);
  });

  it("rejects a name longer than 80 characters", () => {
    const storage = memoryStorage();

    expect(
      saveHabits(storage, {
        version: 1,
        habits: [{ ...readHabit, name: "a".repeat(81) }],
      }),
    ).toEqual({
      status: "invalid",
      message: "Habit name must be 1–80 characters.",
    });
    expect(storage.data).toEqual({});
  });

  it("rejects a control character in a name before writing", () => {
    const storage = memoryStorage();

    expect(
      saveHabits(storage, {
        version: 1,
        habits: [{ ...readHabit, name: "Read\u202E" }],
      }),
    ).toEqual({
      status: "invalid",
      message: "Habit name must be 1–80 characters.",
    });
    expect(storage.data).toEqual({});
  });

  it("reports unavailable when writing throws and keeps the previous value", () => {
    const previous = JSON.stringify({ version: 1, habits: [] });
    const storage = {
      value: previous,
      getItem() {
        return this.value;
      },
      setItem() {
        throw new Error("quota");
      },
    };

    expect(saveHabits(storage, { version: 1, habits: [readHabit] })).toEqual({
      status: "unavailable",
    });
    expect(storage.value).toBe(previous);
  });
});
