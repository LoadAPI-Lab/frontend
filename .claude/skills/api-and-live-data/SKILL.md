---
name: api-and-live-data
description: How the LoadAPI frontend talks to the backend, covering same-origin proxying of core's /v1 paths, cookie-based Google/GitHub OAuth sessions, the orval-generated client from core's OpenAPI, TanStack Query patterns, the live test snapshot stream (SSE), worker data contracts and MSW mocks. Use when calling any endpoint, touching login or route guards, adding a query or mutation, showing live test metrics, or mocking API responses.
---

# API and live data

## Source of truth

The backend `core` app (NestJS + nestjs-zod) publishes an OpenAPI document via Swagger:

- JSON: `http://localhost:3001/docs/json` locally, Swagger UI at `/docs`. Core has no committed spec file: NestJS builds it at startup.
- API routes are URI-versioned: `/v1/...`. The browser calls the **same paths on its own origin** (`/v1/...`); the dev server or reverse proxy forwards `/v1/*` to core unchanged. No `/api` prefix: core scopes its auth cookies to `/v1/auth` (refresh) and `/v1/oauth` (OAuth state), so a prefixed path would never carry them.

We **generate** the client; we never hand-write request types that exist in the spec.

```bash
pnpm api:generate   # orval: spec → src/api/generated (Query hooks, Zod schemas, MSW handlers)
```

- `orval.config.ts` points `input` at `OPENAPI_URL` or the committed `openapi/openapi.json` snapshot (refresh it with `curl -sf http://localhost:3001/docs/json -o openapi/openapi.json` on a running core). Commit the snapshot so CI and mock mode work without a backend.
- The config skips the `Health` tag, rewrites `const` to a one-value `enum` (core's spec says OpenAPI 3.0 but uses 3.1's `const`), and names operations from core's ids: `UsersController_me_v1` → `usersMe`, hook `useUsersMe`, key `getUsersMeQueryKey()`, Zod `UsersMeResponse`.
- `fetcher.ts` exports `ErrorType`, so generated hooks type errors as `ApiError<GlobalErrorResponseOutput>`.
- CI regenerates and fails if `src/api/generated` differs from what is committed.
- Output mode `tags-split`, client `react-query`, plus the `zod` and `msw` generators.
- `src/api/generated/**` is never edited by hand and is excluded from lint and format.
- When the backend changes the spec: refresh the snapshot, regenerate, fix type errors, and commit as `chore(api): sync openapi` on its own.
- Hook names come from `operationId`, so a renamed controller or method on core renames the hook.

Sync steps:

```bash
# in ~/backend, on the branch with the change: rebuild core
docker compose -f infra/docker-compose.yml up -d --build
# in this repo
OPENAPI_URL=http://localhost:3001/docs/json pnpm api:generate
curl -fsS http://localhost:3001/docs/json -o openapi/openapi.json && pnpm format
```

## Fetcher (orval mutator)

`src/api/fetcher.ts`:

- Base path `config.apiBase` (default empty = same origin). Paths are core's own: `apiFetch('/v1/users/me')`.
- `credentials: 'same-origin'`: the session is two httpOnly cookies set by core. No tokens in JS, no `Authorization` header.
- Puts the response `x-request-id` on errors to match backend logs. Throws a typed `ApiError { status, message, requestId, body }`; `errorCode(error)` reads core's stable `body.code` (e.g. `TEST_RUN.CAPACITY_EXCEEDED`).
- On 401: one shared in-flight `POST /v1/auth/refresh` (`refreshSession()`), retry the request once, otherwise throw the 401. Never for `/v1/auth/*` or `/v1/oauth/*`. Keep this logic only here.
- A 401 that survives the refresh reaches the `QueryCache` / `MutationCache` in `src/app/query-client.ts`: it drops the `['session']` query and calls `router.invalidate()`, so `_app`'s guard sends the user to `/login?redirect=<page>`. No toast for it.

## Auth (Google / GitHub OAuth, cookie session; core `apps/core/src/auth`)

1. `/login` lists `GET /v1/oauth/providers` → `[{ id, name }]` (only providers configured on core). Each is a full-page link to `/v1/oauth/{id}`. On click, the page to return to is saved in `sessionStorage` (`post-login-redirect.ts`): core's flow takes no redirect parameter.
2. Core does the provider round-trip, sets `access_token` (path `/`) and `refresh_token` (path `/v1/auth`) cookies and redirects to our **`/oauth/callback`**, or to `/oauth/callback?error=<code>` (`OAUTH.PROVIDER_DENIED`, `OAUTH.STATE_MISMATCH`, `OAUTH.EMAIL_NOT_VERIFIED`, …).
3. `routes/oauth/callback.tsx` renders nothing: on `error` it redirects to `/login?error=<code>` (message via `oauthErrorKey`), otherwise it drops the cached session and redirects to the saved path. The target's guard loads the user.
4. Current user: `GET /v1/users/me` → `{ id, email, name, avatarUrl?, createdAt }` (query key `['session']`). `_app.tsx` `beforeLoad` ensures it and redirects to `/login?redirect=…` on 401. After a reload with only the refresh cookie left, the fetcher refreshes transparently.
5. Logout: `POST /v1/auth/logout` (204, clears both cookies), then `queryClient.clear()` and go to `/login`.
6. CSRF: core's `OriginGuard` rejects non-GET requests whose `Origin` is not in `CORS_ALLOWED_ORIGINS` (403 `AUTH.ORIGIN_NOT_ALLOWED`). Local dev needs `http://localhost:5173` there.
7. Mock mode: MSW can't answer page navigations, so provider links go straight to `/oauth/callback`.
8. Later (P2): connected accounts, once core adds them.
9. Never read, store or log cookies or tokens in JS.

## TanStack Query rules

- Use generated hooks and functions (`useTestRunsList`, `useTestRunsStart`, `testRunsGet`). Validate responses the UI depends on with the generated Zod schema. Wrap them in a feature hook only to add `select` mapping or invalidation.
- Mutations invalidate by generated query-key helpers, never by string literals.
- Errors: the `MutationCache` in `src/app/query-client.ts` toasts every failed mutation with core's message; opt out per mutation with `meta: { toastOnError: false }`. Queries surface errors through `QueryBoundary`.
- Defaults in `src/app/query-client.ts`: `staleTime: 30s`, `retry: 1` (no retry on 4xx), `refetchOnWindowFocus: false` while a test is running.
- Loading and error UI goes through shared `<QueryBoundary>` / skeleton components, not ad-hoc spinners.

## Test runs API (core, backend `dev` #12, `apps/core/src/test-runs`)

All under `/v1/test-runs` (same path in the browser). No auth guard yet; after the users drop, runs belong to a user (list filtered, stop owner-only) and responses include `config`.

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

Core masks secrets in stored run configs (`***`; Authorization keeps its scheme, `Bearer ***`). See `frontend-conventions` → Product decisions for how the UI handles it.

## Single request (`POST /v1/requests`)

Sends one request through core and stores nothing (used by Send, FE-46). Limits: 30 per user per minute, 1 MB body limits, no body on GET/HEAD. Refusals (private host, 429) are shown inside the Response card, not toasted (`meta: { toastOnError: false }`).

## Outbound protection (backend #19)

Core and the worker refuse private/internal hosts unless `OUTBOUND_ALLOW_PRIVATE_NETWORKS=true` (or the host is in `OUTBOUND_ALLOWED_HOSTS`) in the backend's `infra/.env`. Locally it must be on to test against `testserver`; otherwise runs show "Blocked target" and Send shows the private-network message. Snapshots then carry the worker's `blocked` network error kind.

Placeholders resolved by the worker: `{{$uuid}}`, `{{$randomInt}}`, `{{$randomEmail}}`, `{{$timestamp}}`; scenario steps can use `{{name}}` from earlier `extract: [{ name, path }]` rules.

## Live metrics (SSE)

`GET /v1/test-runs/:id/metrics`. Auth is the same-origin cookie, so a native `EventSource` works (`withCredentials` not needed on the same origin). Listen with `addEventListener('status' | 'snapshot', …)`. Events are named:

- `status`: `{ status, reason? }`. Always sent FIRST with the current status. For a finished run it is the only event and the stream ends.
- `snapshot`: the worker's per-second `Snapshot` (`testId, timestamp, elapsedSeconds, targetRps, actualRps, targets[]`), validated with `snapshotSchema`.
- The SSE stream is not in the OpenAPI spec: its schemas are hand-written in `src/api/live/schemas.ts`. When the worker changes snapshot fields, update them by hand. Unknown network error kinds are counted as `other`, so a new kind can't make snapshots fail validation.
- The stream completes after a final `status` event. Stop reading then; do not reconnect after a final status.

Rules:

- `src/api/live/snapshot-stream.ts` owns the stream (`EventSource`, close on unmount; `EventSource` can't see status codes, so on `error` before any event, call `refreshSession()` once and reconnect, else treat the session as expired); `useLiveTest(runId)` reads a per-run store via `useSyncExternalStore` and returns `{ status, reason, snapshots, totals, latest }`.
- Snapshots are per-second windows: sum counts client-side; never average percentiles. Overall percentiles come from `GET /v1/test-runs/:id` `result` after the run.
- **No replay:** core buffers only from when you connect, so a reload mid-run starts with an empty chart. Show what you have plus totals; ask backend for a snapshots-so-far endpoint (plan risk).
- Keep at most `durationSeconds + 5` points. Close on unmount.
- Stop: `POST /stop`, show "Stopping…" until the `status` event says `STOPPED`.
- Reverse proxy and compression must not buffer this route (core TODO).

## Mocks (MSW)

- `src/mocks/handlers.ts` lists hand-written handlers first (MSW uses the first match, so they win), then the generated `get…Mock()` handlers, which answer every other endpoint with faker data.
- `src/mocks/live.ts` fakes `/v1/test-runs/:id/metrics` with MSW 3's `sse()` handler: a `status` RUNNING event, then a plausible `snapshot` every second ramping `actualRps` over `rampUpSeconds`, then a final `status` COMPLETED; `GET /v1/test-runs/:id` then returns a matching `result`.
- Mock mode (`pnpm dev:mock`, or `API_MOCKING=true` in the container) starts the MSW service worker before rendering. Tests use the same handlers through `msw/node`.
- When the real backend and a mock disagree, the backend wins: update the snapshot spec and regenerate.
