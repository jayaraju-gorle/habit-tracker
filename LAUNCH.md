# Launch: Habits

Decision: **no-go**.

The static export builds, tests pass, and the weekly habit type is behind a flag that ships off. Production launch is blocked by unfixed high and critical audit findings, no measured Core Web Vitals, no axe pass, no client error reporting, and no live host with TLS and the security headers applied.

## Feature flag

| Field | Value |
| --- | --- |
| Id | `weeklyHabits` |
| What it gates | The Weekly choice when adding a habit |
| Owner | habit-tracker maintainers |
| Expires | 2026-10-24 |
| Shipped default | `false` in `public/flags.json` |
| Safe failure | A missing, unreadable, or non-boolean flag stays off |

Daily habits are the default path. Existing weekly habits already on a device stay visible if the flag is later turned off. New weekly habits can be created only while the flag is on.

Both states are covered in `tests/flags.test.ts`. Weekly streak rules are covered in `tests/weeks.test.ts`.

Do not nest another flag inside this one. Remove the flag, the fetch, and the daily-only branch within two weeks of turning it on for every device, and no later than 2026-10-24.

## Pre-launch checklist

### Code quality

- [x] Unit tests pass: `npm test` (51 tests). There is no browser end-to-end suite in CI.
- [x] `npm run build` exports `out/` after the header rewrites were removed from `next.config.ts` so the export build is quiet.
- [x] `npx tsc --noEmit` passes. `npm run lint` is that typecheck.
- [ ] A second person has not approved this launch.
- [x] No TODO or `console.log` in application source.
- [x] Storage failures, corrupt data, and a future store version have on-screen states.

### Security

- [x] No secrets in source.
- [ ] `npm audit` reports 2 critical (Vitest, Tinypool) and 1 high (PostCSS, via Next). The fixes are major upgrades. Vitest is not in the browser bundle. PostCSS runs at build time on our CSS, not on habit names. They are still open.
- [x] Habit names and `localStorage` payloads are validated before use. Names render as text.
- [x] No accounts, so there is no authentication surface.
- [ ] Security headers are in `public/_headers` for Netlify and Cloudflare Pages. A static export does not send them itself. They are not verified on a live host. HSTS is not set.
- [x] No authentication endpoint, so there is nothing to rate-limit.
- [x] No cross-origin API. The page only fetches same-origin `/flags.json`.

### Performance

- [ ] Core Web Vitals have not been measured.
- [x] No server queries.
- [x] The only image is the SVG icon.
- [ ] First Load JS is about 120 kB. No budget was set, and it was not compared to a limit.
- [x] No database.
- [ ] Cache rules exist only for `/flags.json` (`no-cache` in `public/_headers`). Other assets have no host cache policy yet.

### Accessibility

- [x] The add form, type select, and checkboxes are native controls.
- [ ] A screen reader pass has not been done.
- [ ] Contrast has not been measured against 4.5:1.
- [x] There is no modal. Save and name errors use `role="alert"` and `aria-describedby`.
- [ ] axe-core and Lighthouse have not been run.

### Infrastructure

- [x] The static site needs no environment variables. The flag file is the release switch.
- [x] No database migration. Store version stays 1.
- [ ] No domain or certificate has been attached.
- [ ] No CDN is configured.
- [ ] No error reporting. Host access logs are the only signal, and they do not see `localStorage` failures.
- [x] `public/health.txt` contains `ok` and is copied to `out/health.txt`.

### Documentation

- [x] README lists local run commands and points here for launch.
- [x] The storage contract is in `src/lib/habit-store.ts` and `SPEC.md`.
- [x] The static-host and flag decision is this file.
- [ ] No changelog.

## Deploy plan

Any host that serves the `out/` directory over HTTPS is enough. Netlify, Cloudflare Pages, GitHub Pages, and an S3 bucket with a website endpoint all fit. Nothing in the app calls a server. Habit data stays in the browser.

```bash
npm ci
npm test
npm run build
```

Publish the `out/` directory. For Netlify or Cloudflare Pages, the publish directory is `out` and `out/_headers` must be uploaded with it. For S3 or GitHub Pages, set the same headers from `public/_headers` in the host's own config. Require HTTPS on the host.

Confirm after upload:

1. `GET /health.txt` returns `ok`.
2. `GET /flags.json` returns `{"weeklyHabits": false}` and `Cache-Control: no-cache`.
3. The page loads, a daily habit can be added, today can be checked, and a reload keeps the streak.
4. The Habit type control is absent.
5. Response headers include nosniff, no-referrer, DENY framing, and the content security policy from `_headers`.

### Staged rollout

There is no account, so a percentage of users cannot be selected. The stages are file changes, not cohorts.

1. Upload `out/` with `weeklyHabits` false. Smoke-test the daily flow. Watch host logs for 404s and 5xx.
2. On one device, set `weeklyHabits` to true in the published `flags.json`, hard-reload, and add a weekly habit. Check this week, reload, and confirm a 1-week streak.
3. Leave that file in place for a day. Roll back to false if weekly streaks or saves fail.
4. Set `weeklyHabits` to true for every visitor only after that check. Keep it for a week, then delete the flag in code by 2026-10-24.

Advance only when the daily flow still works and the browser console has no new errors. Roll back if saves fail, streaks disagree with the rules in `SPEC.md`, or the page fails to load.

### Error budget

No budget is being measured. Until the host reports availability, treat the budget as unknown and do not launch. After launch, the rule is:

- More than 20% of the monthly error budget left: ship normally.
- 0–20% left: flag flips only, no other changes.
- Budget gone: freeze the flag and fix reliability.
- Page error rate above 2× the trailing baseline, or host 5xx above 1%: roll back.

### First hour

1. `GET /health.txt` is 200 and the body is `ok`.
2. Host logs show no new 5xx.
3. Add a habit, mark today done, reload.
4. Confirm `flags.json` is still false.
5. Confirm the previous `out/` directory is still available for upload.

## Rollback plan for Habits

### Triggers

- The page does not load, or `/health.txt` is not 200.
- Host 5xx or client failures on load rise above twice the baseline.
- A daily check-off fails to persist after reload.
- A weekly streak is wrong while the flag is on.
- A security issue shows up in habit names or stored data.

### Steps

1. Kill switch, under a minute: set `weeklyHabits` to `false` in the published `flags.json` and purge that URL from the CDN. Visitors who reload lose the Weekly choice. Habits already stored on their device stay, including weekly ones.
2. Full rollback, one upload: publish the previous `out/` directory. If it is not retained, rebuild it:

```bash
git checkout <previous-release-sha>
npm ci
npm test
npm run build
```

Upload that `out/`. Keep the last good `out/` next to the new one so this does not require a rebuild.

3. Confirm `GET /health.txt` is `ok`, `flags.json` has `weeklyHabits` false, and a daily habit still checks off after reload.
4. Tell whoever is watching the launch that the flag is off or the previous export is live.

### Data

There is no database. `habit-tracker:v1` on each device is left untouched. Do not ask people to clear site data as part of rollback. Version 1 can still read a weekly habit after the flag is off.

### Time

- Flag off: under 1 minute, plus CDN purge.
- Previous `out/` upload: under 15 minutes if the artifact was kept. A clean rebuild is longer.
- Database: none.

## Go / no-go

**No-go.**

Ship the export only after the audit findings are fixed or explicitly accepted with a review date, a live HTTPS host is serving `out/` with the `_headers` policy, `/health.txt` and `/flags.json` have been checked there, and a daily add-check-reload has been done on that host. The flag stays false for that first deploy.
