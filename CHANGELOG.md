# Changelog

## Unreleased

### Added

- Content security policy meta tag and `public/frame-guard.js` so a GitHub Pages upload can block framing without response headers.
- On-device error log at `habit-tracker:errors`. A render crash shows a reload screen and stores a generic message.
- `NEXT_PUBLIC_BASE_PATH` for a GitHub project site. Local dev and user sites leave it unset.
- Launch measurements in `LAUNCH.md`: Lighthouse, axe, contrast, and the accessibility tree.

### Changed

- Vitest 5.0.3 and PostCSS 8.5.29. `npm audit` reports no vulnerabilities.
- `flags.json` is fetched with `cache: "no-store"`.
- The header says “Your habits stay on this device.” so the largest text is in the first HTML.
- The habit checkbox description is “Done today, 1-day streak” (or the weekly equivalent).
- Local development allows `'unsafe-eval'` in the content security policy so the page can leave the loading state. Production does not.

### Security

- PostCSS is overridden to 8.5.29. Vitest is no longer on the vulnerable 3.x line.
