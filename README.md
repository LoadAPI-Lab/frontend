# LoadAPI frontend (routelab)

Web app for LoadAPI: design, test and load-test web APIs. React SPA (no SSR), talks to the
[backend](https://github.com/LoadAPI-Lab/backend) `core` service on the same origin (core's `/v1/*` paths are proxied unchanged).

Status: in development. v1 scope: OAuth login, collections, **Single** stress tests with live metrics, scenarios, history.
Desktop only (≥ 1280px). English only, with every string translatable.

## Stack

React 19 · Vite 8 · TypeScript · TanStack Router + Query · Base UI · Tailwind CSS 4 · i18next ·
Zod · orval · Vitest · Testing Library · MSW · Playwright · Storybook · oxlint + oxfmt · pnpm

## First-time setup (only once, by whoever creates the lockfile)

```bash
corepack enable            # or: npm i -g pnpm@11
sh scripts/install-deps.sh # resolves latest versions, writes pnpm-lock.yaml
pnpm format && pnpm lint && pnpm typecheck && pnpm test
git add -A && git commit -m "chore: scaffold frontend"
```

After that everyone runs `pnpm install`.

## Develop

```bash
pnpm dev:mock   # no backend needed: MSW mocks the API         → http://localhost:5173
pnpm dev        # proxies /v1 to core on http://localhost:3001 (override with API_PROXY_TARGET)
pnpm storybook  # component workshop                            → http://localhost:6006
```

To run against a local backend: start it from the backend repo (`infra/README.md`), set core's
`FRONTEND_URL` and `CORS_ALLOWED_ORIGINS` to `http://localhost:5173`, then `pnpm dev`.

## Scripts

| Script                                         | What it does                                          |
| ---------------------------------------------- | ----------------------------------------------------- |
| `pnpm build` / `pnpm build:mock`               | type check + production build (real API / MSW mocks)  |
| `pnpm lint` · `pnpm format` · `pnpm typecheck` | oxlint · oxfmt · tsc                                  |
| `pnpm test` · `pnpm test:w` · `pnpm test:c`    | unit + component tests (once / watch / coverage)      |
| `pnpm test:storybook`                          | stories as browser tests with a11y checks             |
| `pnpm test:e2e`                                | Playwright against a mocked build                     |
| `pnpm api:generate`                            | regenerate the API client from `openapi/openapi.json` |

## Docker

Images are published to `ghcr.io/loadapi-lab/frontend` (`dev`, `main`, `latest`, `sha-…`, semver tags)
for linux/amd64 and linux/arm64.

### Run with Docker Compose (no Node or pnpm needed)

Start the backend first (its `infra/README.md`), then from this folder:

```bash
docker compose pull
docker compose up -d
```

Open http://localhost:5173. The container serves the app and forwards `/v1/*` to core on
`localhost:3001`, so sign-in works with the backend's default `FRONTEND_URL` and `CORS_ALLOWED_ORIGINS`
(`http://localhost:5173`). Don't run it together with `pnpm dev`: both use port 5173.

```bash
docker compose up -d --build   # build from this checkout instead of pulling
docker compose logs -f         # logs
docker compose down            # stop
```

`docker login ghcr.io` is only needed if the package is private. Optional settings go in a `.env`
next to `docker-compose.yml` (see `.env.example`):

| Variable        | Default                            | Use                                                                                 |
| --------------- | ---------------------------------- | ----------------------------------------------------------------------------------- |
| `IMAGE_TAG`     | `dev`                              | pin a version, e.g. `sha-…`                                                         |
| `FRONTEND_PORT` | `5173`                             | another host port (then add it to core's `FRONTEND_URL` and `CORS_ALLOWED_ORIGINS`) |
| `API_UPSTREAM`  | `http://host.docker.internal:3001` | where core runs                                                                     |
| `API_MOCKING`   | `false`                            | `true` runs the app on mocks, no backend                                            |

`host.docker.internal` is provided by Docker Desktop (macOS, Windows). On Linux, core's ports are bound to
`127.0.0.1` and are not reachable from another compose project.

### Run the image directly

```bash
docker run --rm -p 5080:8080 -e API_MOCKING=true ghcr.io/loadapi-lab/frontend:dev
docker run --rm -p 5080:8080 -e API_UPSTREAM=http://host.docker.internal:3001 ghcr.io/loadapi-lab/frontend:dev
```

### Behind the shared reverse proxy

Leave `API_UPSTREAM` empty: the proxy routes `/v1/*` to core unchanged (no prefix: core's auth cookies are
scoped to `/v1/auth` and `/v1/oauth`). Add the site's origin to core's `CORS_ALLOWED_ORIGINS`, and set
`FRONTEND_URL` to it so sign-in comes back to `/oauth/callback`. Runtime variables: `API_UPSTREAM`,
`API_MOCKING`, `FEATURE_BATCH`, `FEATURE_ROUND_ROBIN`.

## Project layout and conventions

See `.claude/skills/*/SKILL.md` (also read by Claude Code):
`frontend-conventions`, `ui-components`, `api-and-live-data`, `testing`. Contributing rules: [CONTRIBUTING.md](./CONTRIBUTING.md).
