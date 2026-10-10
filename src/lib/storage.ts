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
const MAX_RAW_LENGTH = 100_000;
const MAX_HABITS = 100;
const MAX_COMPLETIONS = 2000;
const UNSAFE_NAME = /[\u0000-\u001F\u007F\u202A-\u202E\u2066-\u2069]/;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/;
const CREATED_AT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;

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

function strictDates(values: unknown): string[] | null {
  if (!Array.isArray(values) || values.length > MAX_COMPLETIONS) return null;
  if (values.some((value) => typeof value !== "string" || !isIsoDate(value))) return null;
  return [...new Set(values)].sort();
}

function looseDates(values: unknown[]): string[] | null {
  if (values.length > MAX_COMPLETIONS) return null;
  if (values.some((value) => typeof value !== "string")) return null;
  const dates = values as string[];
  return [...new Set(dates.filter(isIsoDate))].sort();
}

function normalizeName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value.trim();
  if (name.length < 1 || name.length > 80) return null;
  if (UNSAFE_NAME.test(name)) return null;
  return name;
}

function isSafeId(value: unknown): value is string {
  return typeof value === "string" && SAFE_ID.test(value);
}

function isCreatedAt(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length <= 40 &&
    CREATED_AT.test(value) &&
    !Number.isNaN(Date.parse(value))
  );
}

function isCadence(value: unknown): value is Cadence {
  return value === "daily" || value === "weekly";
}

function readV1(value: Record<string, unknown>): HabitStore | null {
  if (!Array.isArray(value.habits) || value.habits.length > MAX_HABITS) return null;
  const habits: Habit[] = [];
  const ids = new Set<string>();
  for (const entry of value.habits) {
    if (!isRecord(entry)) return null;
    const name = normalizeName(entry.name);
    const completions = strictDates(entry.completions);
    if (
      !isSafeId(entry.id) ||
      ids.has(entry.id) ||
      name === null ||
      entry.name !== name ||
      !isCadence(entry.cadence) ||
      !isCreatedAt(entry.createdAt) ||
      completions === null
    ) {
      return null;
    }
    ids.add(entry.id);
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
  if (!Array.isArray(value.habits) || value.habits.length > MAX_HABITS) return null;
  const createId = options.createId ?? (() => crypto.randomUUID());
  const now = options.now ?? new Date();
  const habits: Habit[] = [];
  const ids = new Set<string>();

  for (const entry of value.habits) {
    if (!isRecord(entry) || !Array.isArray(entry.completedDates)) return null;
    const name = normalizeName(entry.name);
    if (name === null) continue;
    const completions = looseDates(entry.completedDates);
    if (completions === null) return null;
    const id = createId();
    if (!isSafeId(id) || ids.has(id)) return null;
    ids.add(id);
    const createdAt = completions[0] ? `${completions[0]}T00:00:00.000Z` : now.toISOString();
    if (!isCreatedAt(createdAt)) return null;
    habits.push({
      id,
      name,
      cadence: "daily",
      createdAt,
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

  if (raw === null) {
    return { status: "ready", store: emptyStore(), migratedFrom: null };
  }
  if (raw.length > MAX_RAW_LENGTH) return { status: "corrupt" };
  if (raw.trim() === "") {
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
  if (store.habits.length > MAX_HABITS) return null;
  const habits: Habit[] = [];
  const ids = new Set<string>();
  for (const habit of store.habits) {
    const name = normalizeName(habit.name);
    const completions = strictDates(habit.completions);
    if (
      !isSafeId(habit.id) ||
      ids.has(habit.id) ||
      name === null ||
      !isCadence(habit.cadence) ||
      !isCreatedAt(habit.createdAt) ||
      completions === null
    ) {
      return null;
    }
    ids.add(habit.id);
    habits.push({
      id: habit.id,
      name,
      cadence: habit.cadence,
      createdAt: habit.createdAt,
      completions,
    });
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
