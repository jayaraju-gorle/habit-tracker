# Implementation Plan: Local Habit Tracker

## Overview

Build the on-device habit tracker specified in `SPEC.md`. The user adds and renames habits, chooses daily or weekly at creation, checks off the current period, and sees a streak. One missed closed period resets that habit's streak to zero. The only store is `localStorage` key `habit-tracker:v1`.

Tasks are recorded in `tasks/todo.md`. This file is the design and the ordered index.

## Architecture Decisions

- Streaks are derived by `streakLength(habit, now)` from completions. The count is not stored.
- Period keys are local `YYYY-MM-DD` dates and Monday-start ISO weeks `YYYY-Www`. Comparison is lexicographic.
- `src/lib/storage.ts` is the only module that reads or writes `localStorage`. UI calls it. Nothing sends the store over the network.
- The page reads storage after mount so server render does not touch `localStorage`.
- Add, rename, and delete are dialogs on one page. Stats are the streak count and the current-period check on each habit. Charts stay out of scope.
- Assumptions in `SPEC.md` stay in force: Monday weeks, delete included, current period can be unchecked, cadence fixed after create, Next.js + TypeScript + Tailwind + shadcn/ui.

## Dependency Graph

```text
Task 1 App shell and test runner
    │
    ├── Task 2 Habit types
    │       │
    │       ├── Task 3 Period keys
    │       │       │
    │       │       └── Task 4 Compute streaks
    │       │
    │       └── Task 5 Persist to localStorage
    │               │
    │               ├── Task 6 Add a habit
    │               │       │
    │               │       ├── Task 7 Mark the current period done
    │               │       │       │
    │               │       │       └── Task 8 Show stats
    │               │       │
    │               │       ├── Task 9 Rename a habit
    │               │       │
    │               │       └── Task 10 Delete a habit
    │               │
    │               └── Task 11 Storage failure states
    │
    └── (Task 3 and Task 5 can proceed together after Task 2)
```

Build order: 1 → 2 → 3 and 5 → 4 (after 3) → 6 (after 5) → 7 (after 3 and 6) → 8 (after 4 and 7) → 9 and 10 (after 6) → 11 (after 5 and 6).

## Task List

### Phase 1: Foundation

- [ ] Task 1: Scaffold the app shell and Vitest
- [ ] Task 2: Define the habit store types
- [ ] Task 3: Compute local day and ISO week keys

### Checkpoint: Period keys

- [ ] `npm test` passes
- [ ] `npm run build` succeeds
- [ ] Review period-key examples before streak work

### Phase 2: Rules and storage

- [ ] Task 4: Compute streaks
- [ ] Task 5: Persist the store to localStorage

### Checkpoint: Pure rules

- [ ] Streak tables in `SPEC.md` pass as unit tests
- [ ] Storage round-trip, corrupt JSON, and failed writes pass as unit tests
- [ ] `npm run build` succeeds

### Phase 3: Core flows

- [ ] Task 6: Add a habit
- [ ] Task 7: Mark the current day or week done
- [ ] Task 8: Show streak stats

### Checkpoint: Core user flow

- [ ] Add a daily habit, check today, reload, and see streak 1
- [ ] A missed closed period shows streak 0 for that habit only
- [ ] `npm test` and `npm run build` succeed
- [ ] Review with a human before polish

### Phase 4: Edit and recovery

- [ ] Task 9: Rename a habit
- [ ] Task 10: Delete a habit
- [ ] Task 11: Show storage failure states

### Checkpoint: Complete

- [ ] Success criteria in `SPEC.md` are met
- [ ] `npm test`, `npm run lint`, and `npm run build` succeed
- [ ] Ready for review

## Parallelization Opportunities

- Safe to parallelize after Task 2: Task 3 (period keys) and Task 5 (localStorage).
- Safe to parallelize after Task 6: Task 9 (rename) and Task 10 (delete).
- Must be sequential: Task 4 after Task 3, Task 7 after Task 6, Task 8 after Task 4 and Task 7.
- Needs coordination: Task 6, Task 7, and Task 11 all edit `src/app/page.tsx` and the habit list. Finish Task 6 before those branches touch the page.

## Risks and Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| ISO week or timezone off-by-one | High | Task 3 tests Monday boundaries, year edges, and local dates before Task 4 |
| Server render calling `localStorage` | High | Read and write only after mount; storage tests use an in-memory double |
| Open period counted as a miss | High | Task 4 encodes the spec tables, including an unchecked current period that still shows the previous chain |
| Corrupt `habit-tracker:v1` overwritten on load | High | Task 5 and Task 11 leave the bytes in place until Reset |
| shadcn setup spreading across extra files | Medium | Add only the dialog, button, and input used by the page |

## Open Questions

- Is Monday the week boundary you want?
- Should delete be in this version?
- Should the current day or week be uncheckable?
- Is the Next.js stack the one to build?

## Definition of done for every task

- Acceptance criteria in `tasks/todo.md` are checked.
- The task verification command passes.
- New streak or storage behavior has a unit test.
- No network persistence, accounts, or closed-period editing.
