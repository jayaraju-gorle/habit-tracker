/**
 * Contract for the on-device habit store.
 *
 * One localStorage key, one JSON object. Load and save never talk to a network.
 * Load does not write. A successful migration is returned in memory; the caller
 * saves it.
 *
 * Missing key, or a blank value: a ready empty v1 store. Nothing is written.
 * Version 1 with a valid shape: ready, returned as stored after completions are
 * made unique and sorted.
 * Version 0, or a versionless object with a habits array of
 * `{ name, completedDates }`: migrated to v1 in memory. Each habit becomes
 * daily. Empty names and names over 80 characters are dropped. Date strings
 * that are not real `YYYY-MM-DD` days are dropped. `migratedFrom` is `0`.
 * Version greater than 1: `future-version`. The bytes stay untouched.
 * JSON that does not parse, or a v1 object that fails the schema: `corrupt`.
 * The bytes stay untouched until the caller saves a replacement.
 * `getItem` or `setItem` throwing: `unavailable`. Save does not change the
 * previous value when validation fails or the write throws.
 */

export const HABIT_STORAGE_KEY = "habit-tracker:v1";

export const CURRENT_STORE_VERSION = 1;

export type Cadence = "daily" | "weekly";

export type Habit = {
  id: string;
  name: string;
  cadence: Cadence;
  createdAt: string;
  completions: string[];
};

export type HabitStore = {
  version: typeof CURRENT_STORE_VERSION;
  habits: Habit[];
};

export type HabitV0 = {
  name: string;
  completedDates: string[];
};

export type HabitStoreV0 = {
  version?: 0;
  habits: HabitV0[];
};

export type LoadResult =
  | {
      status: "ready";
      store: HabitStore;
      migratedFrom: 0 | null;
    }
  | { status: "corrupt" }
  | { status: "future-version"; found: number }
  | { status: "unavailable" };

export type SaveResult =
  | { status: "saved"; store: HabitStore }
  | { status: "invalid"; message: string }
  | { status: "unavailable" };

export type StoragePort = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

export type LoadOptions = {
  createId?: () => string;
  now?: Date;
};
