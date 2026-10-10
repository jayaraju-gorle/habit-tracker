# Launch: Habits

Decision: **go** to upload `out/` to GitHub Pages.

This is a go for the artifact, not a claim that the live site has already been checked. GitHub Pages is not serving this build yet. The first hour after upload is still required, and it is listed below. Do not treat the launch as finished until those checks pass on the `github.io` URL.

Weekly habits stay off. `public/flags.json` ships `"weeklyHabits": false`.

## What changed to clear the no-go

- `npm audit` is clean: 0 critical, high, moderate, or low. Vitest is 5.0.3. `postcss` is pinned to 8.5.29 with an npm override so Next's copy is the patched line. Next stays on 15.5.27.
- The static page sends a content security policy in a meta tag. `public/frame-guard.js` stops the page when it is framed, because a meta policy cannot set `frame-ancestors`. GitHub Pages does not apply `public/_headers`.
- Flag reads use `cache: "no-store"`.
- A render failure shows a generic reload screen and appends `{ at, message: "Habits failed to render." }` to `habit-tracker:errors` on the device. Stacks and habit names are not stored.
- Lighthouse, axe, contrast, and the accessibility tree were measured on the production export. Figures are below.
- `CHANGELOG.md` records this release.

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

## Measured evidence

Lab only. No field Core Web Vitals exist until the site has visitors. Lighthouse 12, mobile defaults (4× CPU, simulated slow 4G), against `out/` served locally without gzip.

| Check | Result |
| --- | --- |
| Performance | 98 |
| Accessibility | 100 |
| Best practices | 100 |
| First Contentful Paint | 0.9 s |
| Largest Contentful Paint | 2.4 s (good) |
| Cumulative Layout Shift | 0 |
| Total Blocking Time | 40 ms |
| Time to Interactive | 3.2 s |
| LCP element | “Your habits stay on this device.” in the header, present in the exported HTML |
| First Load JS for `/` | 120 kB (route 17.3 kB + shared 103 kB) |
| Budget | 150 kB First Load JS. This build fits. |
| axe-core 4.10 | 0 violations on the empty page and after checking a habit |
| Accessibility tree | Checkbox name “Read”, description “Done today, 1-day streak” |
| Console | No page errors during add, check, and reload |
| Persistence | Reload kept `habit-tracker:v1` and “Done today · 1-day streak” |

Contrast of the painted pairs, WCAG relative luminance:

| Pair | Ratio |
| --- | --- |
| Ink `#1c1915` on paper `#f3efe6` | 15.26:1 |
| Ink on sheet `#fffdf8` | 17.23:1 |
| Muted `#5e584e` on sheet | 6.93:1 |
| Muted on paper | 6.14:1 |
| Green `#1d5c40` on sheet | 7.77:1 |
| Sheet on green (button) | 7.77:1 |
| Danger `#7c2d2d` on danger-soft `#f8e8e4` | 7.78:1 |
| Danger on sheet | 9.10:1 |

Computed styles in Chrome matched those tokens. A human screen reader was not used. There is no second reviewer. This go uses the test suite plus the table above.

`npm test`: 56 tests. `npm run lint` (`tsc --noEmit`) passes. `npm run build` exports `out/` with no header or rewrite warnings.

## Pre-launch checklist

### Code quality

- [x] Unit tests pass: `npm test` (56 tests). There is no browser end-to-end suite in CI.
- [x] `npm run build` exports `out/`.
- [x] `npx tsc --noEmit` passes.
- [x] Review evidence is the suite, axe, and Lighthouse recorded above. No second person is on this launch.
- [x] No TODO or `console.log` in application source.
- [x] Storage failures, corrupt data, a future store version, and a render crash have on-screen states.

### Security

- [x] No secrets in source.
- [x] `npm audit` reports 0 vulnerabilities after Vitest 5.0.3 and the PostCSS 8.5.29 override.
- [x] Habit names and `localStorage` payloads are validated before use. Names render as text.
- [x] No accounts, so there is no authentication surface.
- [x] The policy that GitHub Pages can enforce is in the document: meta content security policy, `no-referrer`, and `public/frame-guard.js`. `public/_headers` remains for Netlify or Cloudflare and is not how Pages works.
- [ ] HSTS, `X-Content-Type-Options`, `X-Frame-Options`, and `Permissions-Policy` are response headers. Pages will not send the file’s `_headers`. Confirm HTTPS on `github.io` in the first hour. HSTS is a platform property of `github.io`, not something this repo can set before the site exists.
- [x] No authentication endpoint, so there is nothing to rate-limit.
- [x] No cross-origin API. The page only fetches same-origin `flags.json`.

### Performance

- [x] Lab Core Web Vitals are recorded above. Field data starts after people use the site.
- [x] No server queries.
- [x] The only image is the SVG icon.
- [x] First Load JS is 120 kB against a 150 kB budget.
- [x] No database.
- [x] The browser asks for `flags.json` with `cache: "no-store"`. GitHub’s CDN can still hold that file for about 10 minutes. A flag rollback on Pages is not guaranteed inside one minute.

### Accessibility

- [x] The add form, type select, and checkboxes are native controls.
- [x] The accessibility tree names the habit checkbox and its streak. A human screen reader pass was not done.
- [x] Contrast ratios are at least 6.14:1 for the pairs above.
- [x] There is no modal. Save and name errors use `role="alert"` and `aria-describedby`.
- [x] axe-core reported 0 violations. Lighthouse accessibility scored 100.

### Infrastructure

- [x] The static site needs no environment variables for a user site or local dev. A project site sets `NEXT_PUBLIC_BASE_PATH` at build time.
- [x] No database migration. Store version stays 1.
- [ ] No custom domain is attached. The first deploy can use `github.io`.
- [ ] GitHub Pages’ CDN is the host cache. It is not configured beyond what Pages does by default.
- [x] Render crashes are recorded on the device under `habit-tracker:errors`. There is no third-party reporter and no server to receive one.
- [x] `public/health.txt` contains `ok` and is copied to `out/health.txt`.

### Documentation

- [x] README lists local run commands and points here for launch.
- [x] The storage contract is in `src/lib/habit-store.ts` and `SPEC.md`.
- [x] The GitHub Pages upload and flag decision is this file.
- [x] `CHANGELOG.md` exists.

## Deploy plan

Publish with `.github/workflows/pages.yml`. A push to `main` on GitHub runs the tests, builds `out/`, and deploys that directory with GitHub Actions. Nothing in the app calls a server. Habit data stays in the browser.

This cloud session cannot see your computer’s Coding Projects folder and is not logged into GitHub, so the repo and the Pages site still have to be created from a machine where `gh auth status` succeeds.

User site (`https://<user>.github.io/`): leave `NEXT_PUBLIC_BASE_PATH` unset. Asset and flag URLs stay root-relative.

Project site (`https://<user>.github.io/<repo>/`): build with the repo path, including the leading slash and no trailing slash.

```bash
npm ci
npm test
npm run build
```

For a project site, set the base before the build:

```bash
NEXT_PUBLIC_BASE_PATH=/<repo> npm run build
```

`next.config.ts` applies that value as `basePath` and `assetPrefix`. `flags.json`, `health.txt`, and `frame-guard.js` are requested with the same prefix.

Upload `out/` as the Pages artifact. Pages ignores `out/_headers`. The meta policy and frame guard travel inside the HTML and `frame-guard.js`.

### First hour on the live URL

1. The site is HTTPS.
2. `GET /health.txt` is 200 and the body is `ok`. On a project site the path is `/<repo>/health.txt`.
3. `GET /flags.json` returns `{"weeklyHabits": false}`.
4. The page loads, a daily habit can be added, today can be checked, and a reload keeps the streak.
5. The Habit type control is absent.
6. The document contains the content security policy meta tag, and `frame-guard.js` loads from the same origin.
7. The previous `out/` directory is still available for upload.

`Cache-Control: no-cache` on `flags.json` will not appear on Pages. The browser still uses `cache: "no-store"`. A CDN copy can linger for about 10 minutes, so a flag-only rollback can be slow. Republishing the previous `out/` is the rollback that does not depend on that cache.

### Staged rollout

There is no account, so a percentage of users cannot be selected. The stages are file changes, not cohorts.

1. Upload `out/` with `weeklyHabits` false. Smoke-test the daily flow.
2. On one device, set `weeklyHabits` to true in the published `flags.json`, hard-reload, and add a weekly habit. Check this week, reload, and confirm a 1-week streak. Expect the CDN to keep the old file for about 10 minutes.
3. Leave that file in place for a day. Roll back to false if weekly streaks or saves fail.
4. Set `weeklyHabits` to true for every visitor only after that check. Keep it for a week, then delete the flag in code by 2026-10-24.

Advance only when the daily flow still works and the browser console has no new errors. Roll back if saves fail, streaks disagree with the rules in `SPEC.md`, or the page fails to load.

### Error budget

There is no host error rate before the first upload, so there is no monthly budget to spend yet. After the first hour, use that hour as the baseline:

- More than 20% of the monthly error budget left: ship normally.
- 0–20% left: flag flips only, no other changes.
- Budget gone: freeze the flag and fix reliability.
- Page error rate above 2× the trailing baseline, or host 5xx above 1%: roll back.

Page-load failures on a device are the generic reload screen plus `habit-tracker:errors`. They do not show up in host logs. Host logs only show failed document and asset requests.

## Rollback plan for Habits

### Triggers

- The page does not load, or `/health.txt` is not 200.
- Host 5xx or client failures on load rise above twice the baseline.
- A daily check-off fails to persist after reload.
- A weekly streak is wrong while the flag is on.
- A security issue shows up in habit names or stored data.

### Steps

1. Kill switch: set `weeklyHabits` to `false` in the published `flags.json` and upload that file, or republish an `out/` that contains `"weeklyHabits": false`. Visitors who reload lose the Weekly choice. Habits already stored on their device stay, including weekly ones. On GitHub Pages this can take about 10 minutes because the CDN may keep the previous `flags.json`. It is not a one-minute switch.
2. Full rollback, one upload: publish the previous `out/` directory. If it is not retained, rebuild it:

```bash
git checkout <previous-release-sha>
npm ci
npm test
npm run build
```

Upload that `out/`. Keep the last good `out/` next to the new one so this does not require a rebuild. This is the sure rollback.

3. Confirm `GET /health.txt` is `ok`, `flags.json` has `weeklyHabits` false, and a daily habit still checks off after reload.
4. Tell whoever is watching the launch that the flag is off or the previous export is live.

### Data

There is no database. `habit-tracker:v1` on each device is left untouched. Do not ask people to clear site data as part of rollback. Version 1 can still read a weekly habit after the flag is off. `habit-tracker:errors` is also left in place.

### Time

- Flag file on GitHub Pages: about 10 minutes of CDN delay, not under 1 minute.
- Previous `out/` upload: under 15 minutes if the artifact was kept. A clean rebuild is longer.
- Database: none.

## Go / no-go

**Go** for the GitHub Pages upload of this `out/`, with the flag false.

The live URL is unchecked until the first-hour list above passes. If HTTPS, `health.txt`, `flags.json`, or the daily add-check-reload fails there, treat that as a no-go for leaving the site up and roll back.
