---
name: frontend-conventions
description: Stack, folder layout, state rules, runtime config, v1 scope, code rules, common lint traps, settled product decisions (collections menu, base URL, run memory, masked secrets, Send, Scratch request) and git conventions for the LoadAPI frontend (React SPA, Vite, TypeScript, pnpm). Use before adding or restructuring code, creating a feature or route, changing Tests/History/Collections behaviour, adding a dependency, or writing a commit or PR in this repo.
---

# LoadAPI frontend conventions

Client-only single-page app for LoadAPI (API design, testing and load testing). No SSR.
Backend: `LoadAPI-Lab/backend` (NestJS core + Go worker). This app only talks to `core`, over HTTP and SSE, **on the same origin behind a reverse proxy** (`/v1/*` → core, paths unchanged).

## v1 scope

In: login (Google / GitHub OAuth), collections sidebar + OpenAPI import, **Single** stress test with live metrics, Scenarios, History (Single and Scenario).
Out until later: **Batch** and **Round-robin** (Figma has frames for them). Keep their code paths behind `config.features.batch` / `config.features.roundRobin` (`FEATURE_BATCH`, `FEATURE_ROUND_ROBIN`); the mode switcher hides disabled modes.

**Desktop only:** minimum width 1280px (`desktop` breakpoint in `theme.css`). Below it `DesktopOnlyNotice` covers the app. Do not build responsive or mobile layouts.

**Translatable from day one:** English only, but every user-facing string goes through i18next.

## Stack (do not swap without agreement)

| Concern                   | Choice                                                                                     |
| ------------------------- | ------------------------------------------------------------------------------------------ |
| Runtime / package manager | Node 24, pnpm (same as backend)                                                            |
| Build                     | Vite 8 + `@vitejs/plugin-react`, React Compiler                                            |
| UI                        | React 19.2, TypeScript strict                                                              |
| Routing                   | TanStack Router, file-based routes in `src/routes`, typed search params validated with Zod |
| Server state              | TanStack Query 5                                                                           |
| API client                | orval-generated from core's OpenAPI (see `api-and-live-data`)                              |
| Client state              | `useState` first; Zustand only for cross-feature UI state                                  |
| Forms                     | React Hook Form + Zod 4 resolver                                                           |
| i18n                      | i18next + react-i18next, typed keys                                                        |
| Headless UI               | Base UI (`@base-ui/react`), wrapped in `src/components/ui`                                 |
| Styling                   | Tailwind CSS 4, tokens as CSS variables, `cva` + `cn()`                                    |
| Component workshop        | Storybook for `components/ui` and `components/shared`                                      |
| Lint / format             | oxlint (type-aware) + oxfmt, configs mirror backend `apps/core`                            |
| Tests                     | Vitest + Testing Library + MSW, Playwright (see `testing`)                                 |

## Commands

```bash
pnpm dev            # Vite on :5173, proxies /v1 → http://localhost:3001 (core)
pnpm dev:mock       # same, with MSW instead of a backend
pnpm build          # tsc -b && vite build
pnpm lint | pnpm format | pnpm typecheck
pnpm test           # unit + component (jsdom)
pnpm test:storybook # stories as browser tests + a11y
pnpm test:e2e       # Playwright on a mocked build
pnpm storybook
pnpm api:generate   # orval → src/api/generated
pnpm routes:generate  # TanStack route tree (also runs on postinstall)
```

## Folder layout

```
src/
  main.tsx                 # mount, start MSW in mock mode
  config.ts                # the only reader of runtime config + feature flags
  app/
    providers.tsx          # QueryClientProvider, RouterProvider, Toast provider
    router.ts              # createRouter, context { queryClient, auth }
    query-client.ts
    styles/                # theme.css (tokens), globals.css, fonts
  routes/                  # TanStack file routes only (thin)
    __root.tsx             # html-level error/not-found boundaries
    login.tsx              # public
    _app.tsx               # authed layout: AppShell (top bar + sidebar + outlet), auth guard in beforeLoad
    _app/index.tsx         # redirects to /tests
    _app/tests.tsx         # later: tests.$routeId.tsx
    _app/scenarios.tsx     # later: scenarios.$scenarioId.tsx
    _app/history.tsx       # later: history.$runId.tsx
  features/
    auth/                  # login page, session hook, logout
    collections/           # sidebar tree, route item, OpenAPI import dialog
    stress-tests/          # config form, endpoint header, live metrics, request editor
    scenarios/             # scenario builder (steps, extract rules)
    history/               # runs table, run detail
  components/
    ui/                    # tier 1: styled Base UI / HTML primitives
    shared/                # tier 2: domain-aware presentational blocks
    layout/                # AppShell, TopBar, Sidebar frame, PageHeader
  api/
    generated/             # orval output, never edit
    fetcher.ts             # orval mutator
    live/                  # SSE snapshot stream + store + types
  lib/                     # framework-free helpers (cn, formatters, http-method, placeholders)
  locales/en/*.json        # translation resources, one file per namespace
  types/                   # global .d.ts (i18next keys, Vite env)
  mocks/                   # MSW handlers (generated + live stream), browser + node setup
  test/                    # render helpers, setup
  routeTree.gen.ts         # generated by TanStack Router, git-ignored
e2e/                       # Playwright specs
```

### Inside a feature

```
features/stress-tests/
  index.ts                 # public API: ONLY what routes may import (page components, search schema)
  stress-test-page.tsx     # page component the route renders
  components/              # tier 3 components for this feature
  hooks/                   # use-start-test.ts, use-stop-test.ts (wrap generated hooks + invalidation)
  lib/                     # pure logic (aggregate-snapshots.ts) + tests
  schemas.ts               # Zod schemas for forms and search params
```

### Import boundaries (enforced in review, later by lint)

```
routes → features (via index.ts) → components/shared → components/ui → lib
             ↘ api, lib                ↘ lib
```

- A feature never imports another feature. Shared needs move down to `components/shared` or `lib`.
- `components/**` never imports from `features/**` or `api/**` (no data fetching below tier 3).
- `routes/*` do: search-param validation, `beforeLoad` guards, `loader` prefetch (`queryClient.ensureQueryData`), and render one page component. No JSX beyond that.

## i18n

- No literal user-facing text in JSX, aria-labels, titles or toasts: use `const { t } = useTranslation()` and `t('area.key')`.
- Keys live in `src/locales/en/common.json` (split into more namespaces when a feature grows; register them in `src/app/i18n.ts`). Group keys by feature: `stressTests.*`, `history.*`.
- Keys are typed (`src/types/i18next.d.ts`), so a missing key is a type error.
- Use interpolation and plurals (`t('runs.count', { count })`), never string concatenation.
- Format numbers, dates and durations with `Intl` via helpers in `lib/format.ts`, not by hand.
- Tests and E2E may assert on English text; that is our reference locale.

## Naming

- Files and folders: kebab-case (`stat-card.tsx`, `use-live-test.ts`). Components: PascalCase. Hooks: `useX`.
- Named exports only (route files export `Route`).
- `@/` alias for `src/`. No `../../` across top-level folders.

## State rules

1. Backend data: TanStack Query via generated hooks. Never copy it into Zustand or `useState`.
2. Shareable or reload-safe UI state (selected route, tab, filters, page): router search params with a Zod schema.
3. Live test data: the SSE store in `src/api/live`.
4. Everything else: component state; feature-local React context if 3+ levels deep. Zustand only for cross-feature UI (e.g. sidebar collapsed).

## Runtime config

Same-origin deployment, so the defaults need no config: `API_BASE` is empty and the browser calls `/v1/...` on its own origin.

- Dev: Vite `server.proxy` forwards `/v1` → `API_PROXY_TARGET` (default `http://localhost:3001`) unchanged. That keeps cookies first-party, avoids CORS, and matches core's cookie paths (`/v1/auth`, `/v1/oauth`), which an `/api` prefix would break.
- Mock mode: `pnpm dev:mock` / `pnpm build:mock` read `.env.mock` (`VITE_API_MOCKING=true`) and start the MSW worker before rendering.
- Container: `docker/entrypoint.sh` writes `/env.js` (`window.__ENV__`) from `API_BASE`, `API_MOCKING`, `FEATURE_*` at start, so one image runs anywhere. `API_UPSTREAM` optionally makes the container proxy `/v1` itself.
- `src/config.ts` validates with Zod and exports `config`. Nothing else reads `import.meta.env` or `window.__ENV__`.

## Git and PRs (same rules as backend CONTRIBUTING.md)

- Branch from `dev`, PR into `dev`; `dev → main` is a separate release PR. No direct pushes.
- Prefixes: `feat/`, `fix/`, `refactor/`, `chore/`, `docs/`.
- Conventional Commits (commitlint): `<type>(<scope>): <description>`.
  Scopes: `auth`, `collections`, `stress-tests`, `scenarios`, `history`, `ui`, `shared`, `layout`, `api`, `app`, `e2e`, `ci`, `deps`.
- Before committing: `pnpm format && pnpm lint && pnpm typecheck && pnpm test`. Before a PR, also `pnpm test:storybook && pnpm test:e2e`. Husky + lint-staged run oxfmt and oxlint on staged files; a lint error aborts the commit.
- Small, logical commits. No `console.log`.
- One branch per ticket (e.g. `feat/collection-actions`). Put the ticket id in the PR title: `feat(history): history list, run detail and recent runs (FE-17)`.

## Code rules

- No code comments unless asked for. Lint-disable directives are fine.
- New components get a Storybook story (with axe checks); logic gets unit tests; user flows get Playwright e2e on `build:mock` (see `testing`).
- When widening a shared type into a union, grep every use first: code that destructures one member's fields breaks typecheck.

Common oxlint traps:

- `no-useless-undefined`, also for arguments: make the parameter optional and call `fn()`, not `fn(undefined)`.
- `prefer-tag-over-role`, `consistent-function-scoping`, `no-object-type-as-default-prop`.
- `no-shadow`: e.g. a callback argument named like an outer variable.
- `no-unsafe-type-assertion`: build typed fixtures instead of `as`.
- `no-unused-vars`: remove imports left over after a refactor.
- Tests: `no-conditional-expect`, `require-mock-type-parameters` (`vi.fn<…>()`).

## Product decisions

Settled behaviour; keep it unless the user changes it.

**Collections sidebar**

- Each doc row has an actions menu (hover "…" button, or Shift+F10 / Menu key on the row): Rename, Re-import (`PUT`, keeps the id), Delete (AlertDialog confirm; blocked while a test runs on that doc).

**Tests page**

- The endpoint header shows method, path and base URL only, no doc (collection) name.
- Base URL is always a free-text input (no dropdown), prefilled with the last URL used for that doc, else the doc's first server. Disabled only while a run is starting, running or stopping.
- Core doesn't store which doc/endpoint a run came from; the frontend remembers it in sessionStorage (`lib/run-memory`). A run opened without that (another tab, re-run from History, deleted doc) is shown from the run's own config: method, path and base URL parsed from `target.url`, plus query, headers, body and RPS/duration/ramp-up, editable and restartable (`stress-tests/past-run.ts`). A later improvement would be core storing `source: { specId, endpointKey }` (needs a contract change).
- Core masks secrets in stored runs (`***`; Authorization keeps its scheme, `Bearer ***`). Start stays blocked until a masked value is re-entered. History's Re-run uses core's stored config, so it needs no re-entry.
- **Send (FE-46):** sends one request via core's `POST /v1/requests` (see `api-and-live-data`). It sits next to Start and shares its checks (`stress-tests/request-block.ts`). Before a run the right column shows the Response card instead of empty charts; after a run, a Response / Live metrics switch appears once something was sent. Core's refusals (private host, 429) show inside the card, not as toasts. Single requests don't go to History.

**Scratch request (FE-47)**: one request outside collections, no saved drafts list.

- Route `/tests?scratch=1` (the search param is the number `1`; ignored when `spec` is set). Opened from **New request** (the "+" in the sidebar header; Import beside it has the upload icon) and from the no-endpoint empty state.
- Header replaces the endpoint header: method select, one full-URL input and Clear (`stress-tests/scratch-header.tsx`). The URL's query and the Params tab stay in sync both ways; the route sent to core is the URL without its query, plus the Params rows.
- Stored in sessionStorage `routelab.tests.scratch` (`lib/scratch-request.ts`, a `useSyncExternalStore` store): saved on every edit, removed once empty, so it survives a reload and is gone when the tab closes. Clear empties it and drops `run` from the URL.
- While it has content, a "Scratch request" row (method, URL, running spinner) sits above the collections tree (`collections/scratch-row.tsx`) and opens its last run.
- Its runs are remembered as `{ scratch: true }` in `lib/run-memory`. `RunPlace` is `EndpointPlace | ScratchPlace`: use `placeSearch(place)` to build Tests search params (History's Open charts and Re-run, the active-run banner), `isScratchPlace` to tell them apart, and `EndpointPlace` where only endpoints make sense (edited-body memory). Opening such a run shows the stored scratch request, or rebuilds it from the run's config if cleared (`pastScratch`).
- A URL that isn't `http(s)://…` blocks Send and Start with its own message (`noUrl`); `noServer` stays for a collection path without a base URL.

## Adding a dependency

Check the stack table first. Prefer small, maintained, tree-shakeable packages. Own `chore(deps):` commit, reason in the PR.
