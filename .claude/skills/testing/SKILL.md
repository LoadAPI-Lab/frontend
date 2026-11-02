---
name: testing
description: Testing strategy and conventions for the LoadAPI frontend, covering Vitest unit tests, Testing Library component tests with MSW, Playwright E2E in mocked and full-stack modes, and accessibility checks. Use when writing or fixing tests, deciding what to test, or touching test config and CI test jobs.
---

# Testing

## Layers

| Layer                   | Tool                                                                                                           | Runs                  | What belongs here                                                                                                                                               |
| ----------------------- | -------------------------------------------------------------------------------------------------------------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit                    | Vitest                                                                                                         | every commit (CI)     | pure logic in `lib/` and `api/live`: snapshot aggregation, status grouping, placeholder parsing and validation, formatters, Zod schemas, runtime config parsing |
| Component / integration | Vitest + Testing Library + user-event + MSW (`msw/node`), jsdom                                                | every PR              | a feature's UI against mocked API: config form validation, starting and stopping a test, live cards updating from a fake stream, collection tree navigation     |
| E2E (mocked)            | Playwright + MSW in the browser (`pnpm dev:mock` build)                                                        | every PR              | critical flows in a real browser: login redirect → open route → edit body → start → see live metrics → stop; scenario run; history detail                       |
| E2E (full stack)        | Playwright against the backend's `infra/docker-compose.yml` (built from the backend repo) + frontend container | nightly and on demand | contract smoke tests: a real single test against `testserver` completes and shows results                                                                       |
| Stories                 | Storybook + Vitest addon (browser)                                                                             | every PR              | each tier-1/2 component's states render and pass a11y checks; interaction `play` tests for primitives                                                           |
| Accessibility           | `@axe-core/playwright` inside E2E specs                                                                        | with E2E              | no serious or critical violations on each main page                                                                                                             |

Visual regression (Playwright `toHaveScreenshot`) is optional. Add it only for stable shell screens, not live charts.

## Conventions

- Tests live next to the code: `foo.ts` → `foo.test.ts`, `Foo.tsx` → `Foo.test.tsx`. E2E specs go in `e2e/*.spec.ts`.
- Query by role and accessible name (`getByRole('button', { name: 'Stop test' })`). Use `data-testid` only for canvas or chart internals.
- Do not snapshot rendered markup.
- Network: always through MSW. Never mock `fetch` or generated hooks directly. Override per test with `server.use(...)`.
- `onUnhandledFrame: 'error'` (MSW 3), so a test fails if it hits an endpoint nobody mocked.
- Time: use `vi.useFakeTimers()` for the fake SSE stream and the elapsed timer; advance explicitly.
- Wrap renders in `renderWithProviders()` from `src/test/render.tsx` (fresh QueryClient with `retry: false`; add a memory router there when a test needs `<Link>`).
- `src/test/setup.ts` loads i18n, jest-dom matchers and the MSW server; assertions use the English strings.
- E2E runs at 1440×900; one spec checks the desktop-only notice below 1280px.
- uPlot and CodeMirror do not render meaningfully in jsdom. Test their wrappers' inputs and outputs (data passed in, value changes out) and cover the real rendering in Playwright.
- A bug fix comes with a test that failed before the fix.

## Commands

```bash
pnpm test                 # vitest unit project (unit + component, jsdom)
pnpm test:w               # watch mode
pnpm test:c               # with coverage (v8)
pnpm test:storybook       # vitest storybook project (real Chromium, a11y)
pnpm test:e2e             # playwright on `pnpm build:mock` + preview (port 4173)
pnpm exec playwright test --ui
```

## Coverage

Thresholds start at 70% lines for `src/lib` and `src/api/live` (pure logic must be well covered). No global threshold for UI. Generated code, `mocks/`, and `routes/` are excluded.

## CI

- `ci.yml` job `checks`: install → `format:check` → `lint` → `typecheck` → `test:c` → `build`.
- `ci.yml` job `browser`: install Chromium → `test:storybook` → `test:e2e` (mocked). Uploads the Playwright report on failure.
- Nightly `e2e-stack.yml`: check out the backend repo, `docker compose -f infra/docker-compose.yml up -d --build`, start the frontend image, wait for health, run `@stack`-tagged specs. (Switch to pulling backend images once the backend publishes them.)
- Storybook: `pnpm test:storybook` runs stories as tests (Vitest addon, a11y checks) in CI.
