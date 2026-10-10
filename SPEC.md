# Spec: Local Habit Tracker

## Assumptions

These were not stated in the interview. They are locked here so the rules are testable. Correct them before implementation.

1. This is a browser app on this device. Storage is `localStorage` for this origin. There is no native app and no TV UI.
2. A week starts on Monday and ends on Sunday, in the device's local timezone (ISO week).
3. The user can check or uncheck only the current open day or week. Closed periods stay as recorded.
4. The user can delete a habit. Delete removes that habit and its completions from the device.
5. Cadence is chosen at creation and stays fixed. Renaming changes the name only.
6. Duplicate names are allowed. Habits are identified by id.
7. The stack is Next.js, TypeScript, Tailwind CSS, and shadcn/ui.

## Objective

A single person tracks habits they create, on this device only. They add a habit, name it, and choose daily or weekly. They check off the current day or week. The app shows a streak of consecutive completed periods. One missed period resets that habit's streak to zero.

The user is someone keeping a private list on one browser. Success means the streak rules below hold after reload, and the data never leaves the device.

### Acceptance criteria

- The user can add a habit with a name and a cadence of daily or weekly.
- The user can rename a habit without changing its cadence, completions, or streak history.
- The user can delete a habit.
- The user can check and uncheck the current period for each habit.
- A daily streak counts consecutive completed local days. A weekly streak counts consecutive completed weeks.
- One missed closed period resets that habit's streak to zero. Other habits are unchanged.
- Reloading the page shows the same habits, completions, and streaks.
- With no network, the tracker still loads, edits, and saves.

## Tech Stack

- Next.js (App Router), TypeScript
- Tailwind CSS and shadcn/ui for layout and form controls
- Vitest for unit tests of streak rules and storage
- No database, no auth library, no sync client

## Commands

```bash
npm install
npm run dev -- --port 43123
npm test
npm run lint
npm run build
```

## Project Structure

```text
SPEC.md                 → This specification
src/app/                → App Router pages and layout
src/components/         → Habit list, add form, rename form
src/lib/types.ts        → Store types
src/lib/periods.ts      → Local day and ISO week keys
src/lib/streak.ts       → Pure streak calculation
src/lib/storage.ts      → localStorage read, write, and validation
tests/streak.test.ts    → Streak rules
tests/periods.test.ts   → Period keys and boundaries
tests/storage.test.ts   → Parse, save, and corrupt-data behavior
```

## Code Style

TypeScript, strict types, named exports. Streak logic stays in pure functions that take `now` as an argument. Components call those functions. They do not reimplement the count.

```ts
export function streakLength(habit: Habit, now: Date): number {
  const current = periodKey(habit.cadence, now);
  const created = periodKey(habit.cadence, new Date(habit.createdAt));
  const done = new Set(habit.completions);

  let anchor = current;
  if (!done.has(current)) {
    const prev = previousPeriod(habit.cadence, current);
    if (prev < created || !done.has(prev)) return 0;
    anchor = prev;
  }

  let count = 0;
  for (let period = anchor; period >= created; period = previousPeriod(habit.cadence, period)) {
    if (!done.has(period)) break;
    count += 1;
  }
  return count;
}
```

Names are `camelCase` for functions and `PascalCase` for components and types. Period keys are strings, compared lexicographically because `YYYY-MM-DD` and `YYYY-Www` sort in time order.

## localStorage Data Model

One key, one JSON object. The app never writes a second store and never sends this payload to a server.

- Key: `habit-tracker:v1`
- Version: `1`

```ts
type Cadence = "daily" | "weekly";

type Habit = {
  id: string;              // crypto.randomUUID()
  name: string;            // trimmed, 1–80 characters
  cadence: Cadence;        // fixed after create
  createdAt: string;       // ISO-8601 timestamp
  completions: string[];   // unique period keys, sorted ascending
};

type HabitStore = {
  version: 1;
  habits: Habit[];
};
```

Period keys:

- Daily: local calendar date `YYYY-MM-DD`.
- Weekly: ISO week `YYYY-Www` (Monday start), for example `2026-W15`.

Write rules:

- Save the whole `HabitStore` on every successful add, rename, delete, check, or uncheck.
- `completions` contains each period key at most once, sorted ascending.
- Keys before the habit's creation period, and keys after the current period, are ignored when computing a streak.
- The streak integer is derived. It is not stored.
- Wrap every `getItem` and `setItem` in `try/catch`.
- On JSON parse failure or a shape that does not match `HabitStore`, keep the existing bytes and show the corrupt-data state. Do not overwrite them until the user chooses Reset on this device.
- Reset writes `{ "version": 1, "habits": [] }`.
- If `setItem` throws (quota or storage disabled), keep the in-memory screen as it was before the failed change and show a save-error message.

Load and save results:

- Missing key, or a blank value: ready empty v1 store. Load writes nothing.
- Version 1 with a valid shape: ready. Completion dates are unique and sorted.
- Older version 0, including a versionless `{ habits: [{ name, completedDates }] }` object: migrate in memory to v1 daily habits. `migratedFrom` is `0`. Load writes nothing; the app saves the migrated store. Empty names and impossible dates are dropped.
- Version greater than 1: `future-version`. The saved bytes stay in place.
- Unreadable JSON, a payload over 100000 characters, or a version 1 object that breaks the schema: `corrupt`. The saved bytes stay in place until Reset.
- A version 1 habit is corrupt when its id is not a token of letters, digits, `_`, and `-`, when two habits share an id, when a completion is not a real `YYYY-MM-DD` date, when the name contains a control character or bidirectional override, when there are more than 100 habits, or when one habit has more than 2000 completion entries.
- A name that looks like HTML is stored and shown as text. The page does not parse it as markup.
- A throwing read or write: `unavailable`. A rejected save leaves the previous value in place.

Name rules:

- Trim leading and trailing whitespace before save.
- Reject an empty name.
- Reject a name longer than 80 characters.
- Allow two habits to share a name.

## Core Screens and States

One page. Add and rename open as dialogs on that page.

### Habit list

| State | What the user sees |
| --- | --- |
| Loading | A short "Loading habits" status while the store is read. |
| Empty | "No habits yet" and an Add habit action. |
| Ready | Each habit shows its name, Daily or Weekly, the streak count, and a control for the current period. |
| Storage unavailable | The list is not editable. Copy explains that this browser is blocking on-device storage. |
| Corrupt data | Copy explains the saved data could not be read. The only action is Reset on this device. |
| Save error | The previous list stays visible. Copy explains the last change was not saved. |

Per habit, in the ready state:

- Current period open and already checked: control is checked. Streak includes today or this week.
- Current period open and not checked, previous period completed (or the habit was created this period): control is unchecked. Streak counts the chain through the previous period, or shows 0 when nothing has been completed yet.
- Current period checked after a gap: streak is the new chain ending at the current period, which is 1 when only the current period is done.

### Add habit

- Fields: name, cadence (Daily or Weekly). Daily is the initial choice.
- Save creates the habit with `completions: []` and `createdAt` set to the current time.
- Invalid name shows an inline error and does not write.
- Dismissing the dialog leaves the store unchanged.

### Rename

- Field: name, filled with the current name.
- Save updates `name` only.
- Invalid name shows an inline error and does not write.
- Cadence, id, `createdAt`, and `completions` stay the same.

### Delete

- Asks for confirmation, then removes that habit from `habits`.
- Other habits stay.

## Streak Rules

A period is missed only after it has ended without a completion. The current period is still open, so an unchecked today or this week does not reset the streak yet.

The creation period is the first period that can count. Periods before the habit existed are not misses.

Count:

1. If the current period is completed, the chain ends at the current period.
2. If the current period is not completed and the previous period is before creation, the streak is 0.
3. If the current period is not completed and the previous period is not completed, the streak is 0.
4. If the current period is not completed and the previous period is completed, the chain ends at the previous period.
5. Walk backward through completed periods while each period is on or after the creation period. Stop at the first gap. That walk's length is the streak.
6. A gap of one closed period resets the streak to 0. The next completion starts a new streak at 1.
7. Each habit's streak is independent.

### Daily examples

Assume the habit was created on Monday of the same week.

| Completions | Now | Streak |
| --- | --- | --- |
| none | Monday, open | 0 |
| Monday | Monday | 1 |
| Monday, Tuesday | Wednesday, open, not checked | 2 |
| Monday, Tuesday | Thursday | 0 |
| Monday, Tuesday, Thursday | Thursday | 1 |
| Monday, Wednesday | Wednesday | 1 |

### Weekly examples

Week keys are Monday-start ISO weeks. Assume the habit was created in week `2026-W10`.

| Completions | Now | Streak |
| --- | --- | --- |
| none | `2026-W10`, open | 0 |
| `2026-W10` | `2026-W10` | 1 |
| `2026-W10`, `2026-W11` | `2026-W12`, open, not checked | 2 |
| `2026-W10`, `2026-W11` | `2026-W13` | 0 |
| `2026-W10`, `2026-W11`, `2026-W13` | `2026-W13` | 1 |

## Testing Strategy

Vitest. Tests live in `tests/` and import `src/lib` directly. No browser is required for the streak, period, and storage suites.

- `tests/periods.test.ts` covers local `YYYY-MM-DD` keys, ISO week keys, Monday boundaries, and `previousPeriod` across month and year edges.
- `tests/streak.test.ts` covers every row in the streak tables, a habit created mid-week, completions before `createdAt`, future keys, duplicate keys, and two habits where only one missed a period.
- `tests/storage.test.ts` uses an in-memory `Storage` double. It covers round-trip save and load, blank and overlong names, unique sorted completions, corrupt JSON left in place, reset, and a throwing `setItem`.
- UI checks for empty, ready, storage-unavailable, and corrupt-data states happen in the browser after the app exists. They are not a substitute for the unit tests.
- The streak and storage tests must pass before a change to those modules is committed. Target: every branch in `streak.ts`, `periods.ts`, and `storage.ts` is exercised by those tests.

## Boundaries

- Always: compute streaks from completions and `now`; validate names before write; catch storage failures; keep habit data on this device.
- Ask first: adding a dependency, changing the `habit-tracker:v1` shape, or introducing any server or second storage API.
- Never: accounts, cloud sync, network saves, backfilling closed periods, grace days, editing cadence in place, or storing secrets in `localStorage`.

## Non-goals

- Accounts, sign-in, and multi-user profiles
- Sync to another device, browser, or cloud
- Push notifications, email, or reminders
- A TV or native-app interface
- Editing a closed day or week
- Changing daily to weekly, or weekly to daily, without deleting and creating a new habit
- A grace period, freeze, or partial credit that preserves a streak through a miss
- Calendars, charts, goals, notes, or habit templates
- Import, export, and backup files
- Shared or social habits

## Success Criteria

- Adding "Read" as daily and "Call home" as weekly persists both after reload, with streak 0 until checked.
- Checking the current period raises that habit's streak to 1. Unchecking it returns the streak to the previous chain, or to 0 when this is the only completion.
- The daily and weekly tables in Streak Rules match `streakLength` for those inputs.
- Missing one closed period sets that habit's streak to 0 and leaves every other habit's streak as it was.
- Rename keeps completions. Delete removes only the chosen habit.
- Disconnecting the network does not change load or save behavior.
- A corrupt `habit-tracker:v1` value is still present after a failed load, and is replaced only after Reset.

## Open Questions

- Is Monday the week boundary you want?
- Should delete be in this version?
- Should the current day or week be uncheckable?
- Is the Next.js stack the one to build?
