"use client";

import { useEffect, useId, useState } from "react";
import { HabitName } from "@/components/habit-name";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatLocalDate, localDateKey } from "@/lib/dates";
import {
  type Habit,
  type HabitStore,
  type LoadResult,
} from "@/lib/habit-store";
import { streakLength } from "@/lib/streak";
import { loadHabits, saveHabits } from "@/lib/storage";
import { toggleCompletion } from "@/lib/toggle-completion";

type View =
  | { kind: "loading" }
  | { kind: "ready"; store: HabitStore; saveError: string | null }
  | { kind: "unavailable" }
  | { kind: "corrupt" }
  | { kind: "future-version"; found: number };

const emptyStore: HabitStore = { version: 1, habits: [] };

function viewFromLoad(result: LoadResult): View {
  switch (result.status) {
    case "ready":
      return { kind: "ready", store: result.store, saveError: null };
    case "unavailable":
      return { kind: "unavailable" };
    case "corrupt":
      return { kind: "corrupt" };
    case "future-version":
      return { kind: "future-version", found: result.found };
  }
}

export function HabitTracker() {
  const nameId = useId();
  const errorId = useId();
  const [view, setView] = useState<View>({ kind: "loading" });
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [today] = useState(() => new Date());
  const todayKey = localDateKey(today);

  useEffect(() => {
    const result = loadHabits(window.localStorage);
    if (result.status === "ready" && result.migratedFrom !== null) {
      const saved = saveHabits(window.localStorage, result.store);
      if (saved.status === "saved") {
        setView({ kind: "ready", store: saved.store, saveError: null });
        return;
      }
      setView({
        kind: "ready",
        store: result.store,
        saveError: "The updated habits could not be saved on this device.",
      });
      return;
    }
    setView(viewFromLoad(result));
  }, []);

  function persist(next: HabitStore, previous: HabitStore) {
    const saved = saveHabits(window.localStorage, next);
    if (saved.status === "saved") {
      setView({ kind: "ready", store: saved.store, saveError: null });
      return;
    }
    setView({
      kind: "ready",
      store: previous,
      saveError:
        saved.status === "invalid"
          ? saved.message
          : "The last change was not saved on this device.",
    });
  }

  function addHabit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (view.kind !== "ready") return;
    const trimmed = name.trim();
    if (trimmed.length < 1 || trimmed.length > 80) {
      setNameError("Use 1–80 characters.");
      return;
    }
    const habit: Habit = {
      id: crypto.randomUUID(),
      name: trimmed,
      cadence: "daily",
      createdAt: today.toISOString(),
      completions: [],
    };
    setName("");
    setNameError(null);
    persist({ version: 1, habits: [...view.store.habits, habit] }, view.store);
  }

  function markToday(habitId: string, checked: boolean) {
    if (view.kind !== "ready") return;
    const habits = view.store.habits.map((habit) => {
      if (habit.id !== habitId) return habit;
      const currentlyDone = habit.completions.includes(todayKey);
      if (currentlyDone === checked) return habit;
      return toggleCompletion(habit, todayKey);
    });
    persist({ version: 1, habits }, view.store);
  }

  function resetStore() {
    const saved = saveHabits(window.localStorage, emptyStore);
    if (saved.status === "saved") {
      setView({ kind: "ready", store: saved.store, saveError: null });
      return;
    }
    setView({ kind: "unavailable" });
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-6">
        <p className="text-sm text-[var(--ink-muted)]">{formatLocalDate(today)}</p>
        <h1 className="mt-1 font-serif text-4xl tracking-tight">Habits</h1>
        <p className="mt-2 text-sm text-[var(--ink-muted)]">Stored on this device.</p>
      </header>

      {view.kind === "loading" ? (
        <p role="status" className="text-sm text-[var(--ink-muted)]">
          Loading habits
        </p>
      ) : null}

      {view.kind === "unavailable" ? (
        <p role="alert" className="rounded-md bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">
          This browser is blocking on-device storage. Habits cannot be saved here.
        </p>
      ) : null}

      {view.kind === "corrupt" ? (
        <section className="rounded-md border border-[var(--line)] bg-[var(--sheet)] px-4 py-4" aria-labelledby="corrupt-title">
          <h2 id="corrupt-title" className="text-base font-semibold">
            Saved habits could not be read
          </h2>
          <p className="mt-2 text-sm text-[var(--ink-muted)]">
            The data on this device is still there. Reset replaces it with an empty list.
          </p>
          <Button type="button" className="mt-4 h-10 px-3" onClick={resetStore}>
            Reset on this device
          </Button>
        </section>
      ) : null}

      {view.kind === "future-version" ? (
        <section className="rounded-md border border-[var(--line)] bg-[var(--sheet)] px-4 py-4" aria-labelledby="future-title">
          <h2 id="future-title" className="text-base font-semibold">
            These habits were saved by a newer version
          </h2>
          <p className="mt-2 text-sm text-[var(--ink-muted)]">
            Version {view.found} is on this device. This app leaves that data in place.
          </p>
        </section>
      ) : null}

      {view.kind === "ready" ? (
        <section className="rounded-md border border-[var(--line)] bg-[var(--sheet)] px-4 py-4 sm:px-5" aria-labelledby="today-heading">
          <h2 id="today-heading" className="text-sm font-semibold tracking-wide text-[var(--ink-muted)] uppercase">
            Today
          </h2>

          {view.saveError ? (
            <p id={errorId} role="alert" className="mt-3 rounded-md bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]">
              {view.saveError}
            </p>
          ) : null}

          {view.store.habits.length === 0 ? (
            <p className="mt-4 text-sm" role="status">
              No habits yet. Add one to start a streak.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-[var(--line)]">
              {view.store.habits.map((habit) => {
                const done = habit.completions.includes(todayKey);
                const streak = streakLength(habit.completions, todayKey);
                const streakLabel = streak === 1 ? "1-day streak" : streak === 0 ? "No streak yet" : `${streak}-day streak`;
                return (
                  <li key={habit.id} className="flex items-start gap-3 py-3">
                    <input
                      id={`habit-${habit.id}`}
                      type="checkbox"
                      className="mt-1 h-5 w-5 accent-[var(--green)]"
                      checked={done}
                      aria-describedby={`streak-${habit.id}`}
                      onChange={(event) => markToday(habit.id, event.target.checked)}
                    />
                    <div className="min-w-0 flex-1">
                      <HabitName id={habit.id} name={habit.name} />
                      <p id={`streak-${habit.id}`} className="mt-0.5 text-sm text-[var(--ink-muted)]">
                        <span className={done ? "text-[var(--green)]" : undefined}>{done ? "Done today" : "Not done today"}</span>
                        <span aria-hidden="true"> · </span>
                        <span>{streakLabel}</span>
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <form className="mt-5 border-t border-[var(--line)] pt-4" onSubmit={addHabit}>
            <label htmlFor={nameId} className="text-sm font-medium">
              New habit
            </label>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <Input
                id={nameId}
                name="habit-name"
                value={name}
                maxLength={80}
                autoComplete="off"
                placeholder="Read"
                aria-invalid={nameError ? true : undefined}
                aria-describedby={nameError ? `${nameId}-error` : undefined}
                onChange={(event) => {
                  setName(event.target.value);
                  setNameError(null);
                }}
                className="h-10 min-w-0 flex-1 bg-white"
              />
              <Button type="submit" className="h-10 px-4">
                Add habit
              </Button>
            </div>
            {nameError ? (
              <p id={`${nameId}-error`} className="mt-2 text-sm text-[var(--danger)]">
                {nameError}
              </p>
            ) : null}
          </form>
        </section>
      ) : null}
    </main>
  );
}
