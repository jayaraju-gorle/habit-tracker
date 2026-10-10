import {
  CURRENT_STORE_VERSION,
  HABIT_STORAGE_KEY,
  type Cadence,
  type Habit,
  type HabitStore,
  type LoadOptions,
  type LoadResult,
  type SaveResult,
  type StoragePort,
} from "./habit-store";

const NAME_MESSAGE = "Habit name must be 1–80 characters.";

function emptyStore(): HabitStore {
  return { version: CURRENT_STORE_VERSION, habits: [] };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function normalizeDates(values: unknown): string[] | null {
  if (!Array.isArray(values) || values.some((value) => typeof value !== "string")) {
    return null;
  }
  return [...new Set(values.filter(isIsoDate))].sort();
}

function normalizeName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value.trim();
  if (name.length < 1 || name.length > 80) return null;
  return name;
}

function isCadence(value: unknown): value is Cadence {
  return value === "daily" || value === "weekly";
}

function readV1(value: Record<string, unknown>): HabitStore | null {
  if (!Array.isArray(value.habits)) return null;
  const habits: Habit[] = [];
  for (const entry of value.habits) {
    if (!isRecord(entry)) return null;
    const name = normalizeName(entry.name);
    const completions = normalizeDates(entry.completions);
    if (
      typeof entry.id !== "string" ||
      entry.id.length === 0 ||
      name === null ||
      entry.name !== name ||
      !isCadence(entry.cadence) ||
      typeof entry.createdAt !== "string" ||
      Number.isNaN(Date.parse(entry.createdAt)) ||
      completions === null
    ) {
      return null;
    }
    habits.push({
      id: entry.id,
      name,
      cadence: entry.cadence,
      createdAt: entry.createdAt,
      completions,
    });
  }
  return { version: CURRENT_STORE_VERSION, habits };
}

function migrateV0(value: Record<string, unknown>, options: LoadOptions): HabitStore | null {
  if (!Array.isArray(value.habits)) return null;
  const createId = options.createId ?? (() => crypto.randomUUID());
  const now = options.now ?? new Date();
  const habits: Habit[] = [];

  for (const entry of value.habits) {
    if (!isRecord(entry) || !Array.isArray(entry.completedDates)) return null;
    if (entry.completedDates.some((date) => typeof date !== "string")) return null;
    const name = normalizeName(entry.name);
    if (name === null) continue;
    const completions = [...new Set(entry.completedDates.filter(isIsoDate))].sort();
    habits.push({
      id: createId(),
      name,
      cadence: "daily",
      createdAt: completions[0] ? `${completions[0]}T00:00:00.000Z` : now.toISOString(),
      completions,
    });
  }

  return { version: CURRENT_STORE_VERSION, habits };
}

export function loadHabits(storage: StoragePort, options: LoadOptions = {}): LoadResult {
  let raw: string | null;
  try {
    raw = storage.getItem(HABIT_STORAGE_KEY);
  } catch {
    return { status: "unavailable" };
  }

  if (raw === null || raw.trim() === "") {
    return { status: "ready", store: emptyStore(), migratedFrom: null };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { status: "corrupt" };
  }

  if (!isRecord(parsed)) return { status: "corrupt" };

  const version = parsed.version;
  if (version === CURRENT_STORE_VERSION) {
    const store = readV1(parsed);
    return store ? { status: "ready", store, migratedFrom: null } : { status: "corrupt" };
  }

  if (typeof version === "number" && version > CURRENT_STORE_VERSION) {
    return { status: "future-version", found: version };
  }

  if (version === 0 || version === undefined) {
    const store = migrateV0(parsed, options);
    return store ? { status: "ready", store, migratedFrom: 0 } : { status: "corrupt" };
  }

  return { status: "corrupt" };
}

function prepareStore(store: HabitStore): HabitStore | null {
  if (store.version !== CURRENT_STORE_VERSION || !Array.isArray(store.habits)) return null;
  const habits: Habit[] = [];
  for (const habit of store.habits) {
    const name = normalizeName(habit.name);
    const completions = normalizeDates(habit.completions);
    if (
      typeof habit.id !== "string" ||
      habit.id.length === 0 ||
      name === null ||
      !isCadence(habit.cadence) ||
      typeof habit.createdAt !== "string" ||
      Number.isNaN(Date.parse(habit.createdAt)) ||
      completions === null
    ) {
      return null;
    }
    habits.push({ ...habit, name, completions });
  }
  return { version: CURRENT_STORE_VERSION, habits };
}

export function saveHabits(storage: StoragePort, store: HabitStore): SaveResult {
  const prepared = prepareStore(store);
  if (!prepared) return { status: "invalid", message: NAME_MESSAGE };

  try {
    storage.setItem(HABIT_STORAGE_KEY, JSON.stringify(prepared));
  } catch {
    return { status: "unavailable" };
  }
  return { status: "saved", store: prepared };
}
