---
name: api-and-live-data
description: How the LoadAPI frontend talks to the backend, covering same-origin /api proxying, Google/GitHub OAuth sessions, the orval-generated client from core's OpenAPI, TanStack Query patterns, the live test snapshot stream (SSE), worker data contracts and MSW mocks. Use when calling any endpoint, touching login or route guards, adding a query or mutation, showing live test metrics, or mocking API responses.
---

# API and live data

## Source of truth

The backend `core` app (NestJS + nestjs-zod) publishes an OpenAPI document via Swagger:

- JSON: `http://localhost:3001/docs/json` locally (bootstrap default path `docs`; the backend README says `/api/v1/docs`, so confirm before relying on it)
- API routes are URI-versioned: `/v1/...`. In the browser everything goes through the same-origin proxy: `/api/v1/...`

We **generate** the client; we never hand-write request types that exist in the spec.

```bash
pnpm api:generate   # orval: spec → src/api/generated (Query hooks, Zod schemas, MSW handlers)
```

- `orval.config.ts` points `input` at `OPENAPI_URL` (default local core) or a committed `openapi.json` snapshot. Commit the snapshot so CI and mock mode work without a backend.
- Output mode `tags-split`, client `react-query`, plus the `zod` and `msw` generators.
- `src/api/generated/**` is never edited by hand and is excluded from lint and format.
- When the backend changes the spec: refresh the snapshot, regenerate, fix type errors, and commit as `chore(api): sync openapi`.

## Fetcher (orval mutator)

`src/api/fetcher.ts`:

- Base path `config.API_BASE` (default `/api`, same origin behind the proxy; Vite proxies it in dev).
- `credentials: 'include'` so the httpOnly refresh cookie travels; the access token goes in `Authorization: Bearer <token>`.
- Sends `x-request-id` when we have one and puts the response `x-request-id` on errors to match backend logs.
- Throws a typed `ApiError { status, message, requestId, body }`; `body.code` is core's stable error code (e.g. `TEST_RUN.CAPACITY_EXCEEDED`).
- On 401: one shared in-flight `POST /v1/auth/refresh`, retry the request once, otherwise clear the session and go to `/login?redirect=…`. Keep this logic only here.

## Auth (Google / GitHub OAuth, backend users drop)

Same flow as the backend dev's reference app (deView-inc/frontend `features/auth`):

1. Login buttons come from `GET /v1/oauth/providers`; each is a full-page link to `/api/v1/oauth/{provider}`. Save the intended path in `sessionStorage` first.
2. Core handles the provider callback and redirects to our `/auth/callback` with `provider`, a one-time `token` and `success` (or `success=false&message=…`). Confirm the exact path and params with the backend.
3. The callback route calls `POST /v1/oauth/exchange { provider, token }` → `{ access }`. Never exchange the same token twice (React StrictMode runs effects twice).
4. The access token lives **in memory only** (`src/features/auth/token-store.ts`); the refresh token is an httpOnly cookie set by core. On app start, call `POST /v1/auth/refresh` to restore the session after a reload.
5. Current user: `GET /v1/users/me` (query key `['session']`). `_app.tsx` `beforeLoad` ensures it and redirects to `/login` on 401.
6. Logout: `POST /v1/auth/sign-out`, clear the token and `queryClient.clear()`, go to `/login`.
7. Later (P2): connected accounts via `GET /v1/oauth/providers/connected`, `POST /v1/oauth/{provider}/connect`, `DELETE /v1/oauth/{provider}/disconnect`.
8. Never put tokens in `localStorage`, `sessionStorage`, URLs or logs.
9. Until core ships auth, `pnpm dev:noauth` skips all of this (dev server only).

## TanStack Query rules

- Use generated hooks (`useGetX`, `usePostX`). Wrap them in a feature hook only to add `select` mapping or invalidation.
- Mutations invalidate by generated query-key helpers, never by string literals.
- Errors: the `MutationCache` in `src/app/query-client.ts` toasts every failed mutation with core's message; opt out per mutation with `meta: { toastOnError: false }`. Queries surface errors through `QueryBoundary`.
- Defaults in `src/app/query-client.ts`: `staleTime: 30s`, `retry: 1` (no retry on 4xx), `refetchOnWindowFocus: false` while a test is running.
- Loading and error UI goes through shared `<QueryBoundary>` / skeleton components, not ad-hoc spinners.

## Test runs API (core, backend `dev` #12, `apps/core/src/test-runs`)

All under `/v1/test-runs` (browser: `/api/v1/test-runs`). No auth guard yet; after the users drop, runs belong to a user (list filtered, stop owner-only) and responses include `config`.

| Call                            | Request                                                                                 | Response                                                                              |
| ------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `POST /v1/test-runs`            | `{ type: 'single', config: SingleConfig }` or `{ type: 'scenario', config: { steps } }` | `{ id, status }`                                                                      |
| `GET /v1/test-runs`             | `?limit=1..100 (20)&cursor&status&type`                                                 | `{ items: TestRunListItem[], nextCursor? }` newest first, cursor pagination           |
| `GET /v1/test-runs/:id`         |                                                                                         | `{ id, type, status, createdAt, startedAt?, finishedAt?, reason?, result? }`          |
| `POST /v1/test-runs/:id/stop`   |                                                                                         | 202 `{ id, status }`                                                                  |
| `GET /v1/test-runs/:id/metrics` | SSE                                                                                     | events `status` and `snapshot` (below); not in the OpenAPI contract (`@SkipContract`) |

- `type`: core accepts only `single` and `scenario` (batch and round_robin are rejected).
- `status`: `PENDING → RUNNING → COMPLETED | FAILED | STOPPED`. Active = PENDING, RUNNING. `reason` on FAILED, e.g. "no worker picked up the job in time" (after `PENDING_TIMEOUT_MS`, 30 s locally).
- Limits (`domain/constants/limits.ts`): `targetRps` integer 1..1000, `durationSeconds` integer 1..600, `rampUpSeconds` integer 0..duration (optional), scenario steps 1..50, extract names `^\w+$`. Mirror these in the form schema; better, import them from the generated Zod once the spec exists.
- Target URL: http(s) with a host, no `{` `}` in the host, no unresolved `:id` / `{id}` segment (`{{var}}` and `{{$gen}}` are fine). Method uppercase, one of GET POST PUT PATCH DELETE HEAD OPTIONS.
- `MAX_CONCURRENT_TESTS` (1 locally): starting a second run while one is active is rejected; show core's message.
- Errors: `BaseException` bodies carry `{ code, message }`; `ApiError.body.code` is the stable key (e.g. not found).

```ts
type SingleConfig = {
    target: Target;
    targetRps: number;
    durationSeconds: number;
    rampUpSeconds?: number;
};
interface Target {
    method: HttpMethod;
    url: string;
    headers?: Record<string, string>;
    body?: string;
}
```

Final `result` (COMPLETED / STOPPED) is the worker's `LoadResult` for single runs (`durationMs, targetRps, avgRps, targets[]` with `totalRequests, errorRate`, percentiles, `statusCodes`, `errors`) and `{ summary, steps[] }` for scenarios. Core types it as `unknown`: validate it with our Zod schemas in `src/api/live/schemas.ts`.

Placeholders resolved by the worker: `{{$uuid}}`, `{{$randomInt}}`, `{{$randomEmail}}`, `{{$timestamp}}`; scenario steps can use `{{name}}` from earlier `extract: [{ name, path }]` rules.

## Live metrics (SSE)

`GET /api/v1/test-runs/:id/metrics`. `EventSource` cannot send the Bearer header, so read it with `fetch` (same fetcher headers, `Accept: text/event-stream`) and parse with `eventsource-parser`. Events are named:

- `status`: `{ status, reason? }`. Always sent FIRST with the current status. For a finished run it is the only event and the stream ends.
- `snapshot`: the worker's per-second `Snapshot` (`testId, timestamp, elapsedSeconds, targetRps, actualRps, targets[]`), validated with `snapshotSchema`.
- The stream completes after a final `status` event. Stop reading then; do not reconnect after a final status.

Rules:

- `src/api/live/snapshot-stream.ts` owns the stream (fetch + parser, abort on unmount, refresh once on 401 then reconnect); `useLiveTest(runId)` reads a per-run store via `useSyncExternalStore` and returns `{ status, reason, snapshots, totals, latest }`.
- Snapshots are per-second windows: sum counts client-side; never average percentiles. Overall percentiles come from `GET /v1/test-runs/:id` `result` after the run.
- **No replay:** core buffers only from when you connect, so a reload mid-run starts with an empty chart. Show what you have plus totals; ask backend for a snapshots-so-far endpoint (plan risk).
- Keep at most `durationSeconds + 5` points. Close on unmount.
- Stop: `POST /stop`, show "Stopping…" until the `status` event says `STOPPED`.
- Reverse proxy and compression must not buffer this route (core TODO).

## Mocks (MSW)

- `src/mocks/handlers.ts` combines orval-generated handlers with hand-written ones.
- `src/mocks/live.ts` fakes `/api/v1/test-runs/:id/metrics` with MSW 3's `sse()` handler: a `status` RUNNING event, then a plausible `snapshot` every second ramping `actualRps` over `rampUpSeconds`, then a final `status` COMPLETED; `GET /v1/test-runs/:id` then returns a matching `result`.
- Mock mode (`pnpm dev:mock`, or `API_MOCKING=true` in the container) starts the MSW service worker before rendering. Tests use the same handlers through `msw/node`.
- When the real backend and a mock disagree, the backend wins: update the snapshot spec and regenerate.
