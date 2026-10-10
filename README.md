# Habits

A habit tracker that stays in this browser. Habits, check-offs, and streaks are stored in `localStorage` under `habit-tracker:v1`. Nothing is sent to a server.

## Run

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:43123](http://127.0.0.1:43123).

```bash
npm test
npm run lint
npm run build
```

Launch checks, the GitHub Pages upload, and rollback are in `LAUNCH.md`. The current decision is go for that upload, with the weekly flag off. Weekly habits stay off unless `public/flags.json` sets `weeklyHabits` to true. A project site needs `NEXT_PUBLIC_BASE_PATH=/<repo>` at build time. A user site and local dev leave it unset.

## Storage

`loadHabits` and `saveHabits` in `src/lib/storage.ts` follow the contract in `src/lib/habit-store.ts`.

- A missing key loads an empty version 1 store and writes nothing.
- Version 0, including a versionless `{ habits: [{ name, completedDates }] }` list, migrates in memory to daily habits. The app then saves that version 1 store.
- Unreadable data and version 1 objects that break the schema stay on disk until you reset.
- A newer version stays on disk and is left unread.
