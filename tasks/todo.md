# Task List: Local Habit Tracker

Full acceptance criteria for the plan in `tasks/plan.md`. Do not start a task until its dependencies are done.

## Task 1: Scaffold the app shell and Vitest

**Description:** Create the Next.js TypeScript app, Tailwind, and Vitest so later tasks have `npm test` and `npm run build`. The home page renders the empty state and does not read storage yet.

**Acceptance criteria:**

- [ ] `npm test` runs Vitest and passes a placeholder test
- [ ] `npm run build` succeeds
- [ ] `npm run dev -- --port 43123` serves a page that shows "No habits yet" and an Add habit control that does not save yet

**Verification:**

- [ ] Tests pass: `npm test`
- [ ] Build succeeds: `npm run build`
- [ ] Manual check: open the dev server and confirm the empty copy

**Dependencies:** None

**Files likely touched:**

- `package.json`
- `tsconfig.json`
- `next.config.ts`
- `vitest.config.ts`
- `src/app/page.tsx`

**Estimated scope:** Medium: 3-5 files

## Task 2: Define the habit store types

**Description:** Add the `Habit` and `HabitStore` types from `SPEC.md`, including cadence, creation time, and completion keys.

**Acceptance criteria:**

- [ ] `Cadence` is `"daily"` or `"weekly"`
- [ ] `Habit` has `id`, `name`, `cadence`, `createdAt`, and `completions`
- [ ] `HabitStore` is `{ version: 1; habits: Habit[] }`

**Verification:**

- [ ] Tests pass: `npm test`
- [ ] Build succeeds: `npm run build`
- [ ] Manual check: `src/lib/types.ts` exports those types and the app still builds

**Dependencies:** Task 1

**Files likely touched:**

- `src/lib/types.ts`

**Estimated scope:** Small: 1-2 files

## Task 3: Compute local day and ISO week keys

**Description:** Implement period keys and the previous-period helper. Daily keys use the device's local calendar date. Weekly keys use Monday-start ISO weeks.

**Acceptance criteria:**

- [ ] A local Wednesday maps to that `YYYY-MM-DD`, including dates near a UTC midnight offset
- [ ] Weeks start Monday: Sunday belongs to the ISO week that began the previous Monday, and `2026-W01` boundaries are correct
- [ ] `previousPeriod` walks off month ends and year ends for both cadences (`2026-01-01` and `2026-W01`)

**Verification:**

- [ ] Tests pass: `npm test -- tests/periods.test.ts`
- [ ] Build succeeds: `npm run build`
- [ ] Manual check: tests cover the Monday and year-edge cases named above

**Dependencies:** Task 2

**Files likely touched:**

- `src/lib/periods.ts`
- `tests/periods.test.ts`

**Estimated scope:** Small: 1-2 files

## Checkpoint: After Tasks 1-3

- [ ] All tests pass
- [ ] Application builds without errors
- [ ] Period-key examples match the spec before streak work starts
- [ ] Review with a human before proceeding

## Task 4: Compute streaks

**Description:** Implement `streakLength(habit, now)` so a daily streak is consecutive completed local days and a weekly streak is consecutive completed weeks. The current open period is not a miss. One closed gap resets that habit to zero.

**Acceptance criteria:**

- [ ] Every row in the daily and weekly tables in `SPEC.md` returns the listed streak
- [ ] An unchecked current period still counts a chain that ended in the previous period
- [ ] A habit created mid-week ignores earlier keys, and one habit's miss leaves a second habit's streak unchanged

**Verification:**

- [ ] Tests pass: `npm test -- tests/streak.test.ts`
- [ ] Build succeeds: `npm run build`
- [ ] Manual check: tests include completions before `createdAt`, future keys, and duplicate keys

**Dependencies:** Task 3

**Files likely touched:**

- `src/lib/streak.ts`
- `tests/streak.test.ts`

**Estimated scope:** Small: 1-2 files

## Task 5: Persist the store to localStorage

**Description:** Load and save `habit-tracker:v1`. Validate names, keep completions unique and sorted, and refuse to overwrite corrupt JSON. Surface storage failures to the caller.

**Acceptance criteria:**

- [ ] Save then load returns the same habits, including an added daily habit and an added weekly habit
- [ ] Blank and overlong names are rejected, and completions are stored unique and sorted
- [ ] Corrupt JSON is left unchanged, reset writes `{ "version": 1, "habits": [] }`, and a throwing `setItem` reports failure without changing the caller's last good store

**Verification:**

- [ ] Tests pass: `npm test -- tests/storage.test.ts`
- [ ] Build succeeds: `npm run build`
- [ ] Manual check: tests use an in-memory `Storage` double and never call a network API

**Dependencies:** Task 2

**Files likely touched:**

- `src/lib/storage.ts`
- `tests/storage.test.ts`

**Estimated scope:** Small: 1-2 files

## Checkpoint: After Tasks 4-5

- [ ] All tests pass
- [ ] Application builds without errors
- [ ] Streak tables and storage failure cases are covered by unit tests
- [ ] Review with a human before proceeding

## Task 6: Add a habit

**Description:** Let the user add a habit from the list page. The dialog collects a name and a cadence, defaults cadence to daily, and writes the habit through the storage module.

**Acceptance criteria:**

- [ ] Saving "Read" as daily and "Call home" as weekly stores both with empty completions and a `createdAt` timestamp
- [ ] An empty name or a name longer than 80 characters shows an inline error and does not write
- [ ] Dismissing the dialog leaves storage unchanged, and reload shows the saved habits

**Verification:**

- [ ] Tests pass: `npm test`
- [ ] Build succeeds: `npm run build`
- [ ] Manual check: add both habits, reload, and confirm they remain with streak 0

**Dependencies:** Task 1, Task 5

**Files likely touched:**

- `src/components/add-habit-dialog.tsx`
- `src/components/habit-list.tsx`
- `src/app/page.tsx`

**Estimated scope:** Medium: 3-5 files

## Task 7: Mark the current day or week done

**Description:** Each habit gets a control for the current period only. Checking adds that period key. Unchecking removes it. Closed periods cannot be edited.

**Acceptance criteria:**

- [ ] Checking today, or this week for a weekly habit, stores that period key once and shows the control as checked
- [ ] Unchecking removes that current key and no other key
- [ ] The control does not add or remove keys for a closed day or week

**Verification:**

- [ ] Tests pass: `npm test -- tests/storage.test.ts`
- [ ] Build succeeds: `npm run build`
- [ ] Manual check: check a habit, reload, and confirm the check is still on; uncheck it and reload

**Dependencies:** Task 3, Task 5, Task 6

**Files likely touched:**

- `src/lib/storage.ts`
- `tests/storage.test.ts`
- `src/components/habit-list.tsx`

**Estimated scope:** Medium: 3-5 files

## Task 8: Show streak stats

**Description:** Show each habit's derived streak next to its name and cadence. Stats are the streak count and whether the current period is checked. No chart.

**Acceptance criteria:**

- [ ] A new habit shows streak 0 until the current period is checked, then shows streak 1
- [ ] With the current period unchecked and the previous period complete, the streak still shows that earlier chain
- [ ] After one missed closed period, that habit shows 0 and another habit's streak stays as it was

**Verification:**

- [ ] Tests pass: `npm test -- tests/streak.test.ts`
- [ ] Build succeeds: `npm run build`
- [ ] Manual check: complete today, reload, and read streak 1 on that habit

**Dependencies:** Task 4, Task 7

**Files likely touched:**

- `src/components/habit-list.tsx`
- `src/lib/streak.ts`

**Estimated scope:** Small: 1-2 files

## Checkpoint: After Tasks 6-8

- [ ] All tests pass
- [ ] Application builds without errors
- [ ] Add, check, reload, and streak display work end to end
- [ ] Review with a human before proceeding

## Task 9: Rename a habit

**Description:** Open a rename dialog with the current name. Saving changes the name only.

**Acceptance criteria:**

- [ ] The new name appears on the list and after reload
- [ ] Cadence, id, `createdAt`, and completions stay the same, so the streak is unchanged
- [ ] An invalid name shows an inline error and does not write

**Verification:**

- [ ] Tests pass: `npm test`
- [ ] Build succeeds: `npm run build`
- [ ] Manual check: rename a checked habit and confirm the streak and check stay

**Dependencies:** Task 6

**Files likely touched:**

- `src/components/rename-habit-dialog.tsx`
- `src/components/habit-list.tsx`
- `src/lib/storage.ts`

**Estimated scope:** Medium: 3-5 files

## Task 10: Delete a habit

**Description:** Confirm, then remove one habit and its completions from the device.

**Acceptance criteria:**

- [ ] Confirming delete removes that habit from the list and from `habit-tracker:v1`
- [ ] Cancel leaves the store unchanged
- [ ] Other habits remain, with their completions and streaks

**Verification:**

- [ ] Tests pass: `npm test`
- [ ] Build succeeds: `npm run build`
- [ ] Manual check: delete one of two habits, reload, and confirm only the other remains

**Dependencies:** Task 6

**Files likely touched:**

- `src/components/delete-habit-dialog.tsx`
- `src/components/habit-list.tsx`
- `src/lib/storage.ts`

**Estimated scope:** Medium: 3-5 files

## Task 11: Show storage failure states

**Description:** Cover loading, storage blocked, corrupt data, save error, and reset. Reset is the only action that replaces corrupt bytes.

**Acceptance criteria:**

- [ ] While the store is reading, the page shows "Loading habits"
- [ ] When storage throws on read, the list is not editable and the copy says this browser is blocking on-device storage
- [ ] Corrupt JSON stays in `localStorage` until "Reset on this device", and a failed save keeps the previous list with a save-error message

**Verification:**

- [ ] Tests pass: `npm test -- tests/storage.test.ts`
- [ ] Build succeeds: `npm run build`
- [ ] Manual check: seed corrupt JSON, confirm Reset is required, then confirm a fresh empty list

**Dependencies:** Task 5, Task 6

**Files likely touched:**

- `src/app/page.tsx`
- `src/components/habit-list.tsx`
- `src/lib/storage.ts`
- `tests/storage.test.ts`

**Estimated scope:** Medium: 3-5 files

## Checkpoint: Complete

- [ ] All tests pass: `npm test`
- [ ] Lint succeeds: `npm run lint`
- [ ] Application builds without errors: `npm run build`
- [ ] Success criteria in `SPEC.md` are met on the dev server
- [ ] Ready for review
