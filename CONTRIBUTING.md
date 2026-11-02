# Contributing

Same workflow as the backend repo.

## Branches

- `main` is stable and only updated by merging `dev`. `dev` is the integration branch.
- No direct pushes to `main` or `dev`; everything goes through a PR.
- Short-lived branches from `dev`: `feat/`, `fix/`, `refactor/`, `chore/`, `docs/`.

## Commits

[Conventional Commits](https://www.conventionalcommits.org/), checked by commitlint: `<type>(<scope>): <description>`

Scopes: `auth`, `collections`, `stress-tests`, `scenarios`, `history`, `ui`, `shared`, `layout`, `api`, `app`, `i18n`, `e2e`, `ci`, `docker`, `deps`.

Examples: `feat(stress-tests): add live latency chart`, `fix(auth): keep redirect after login`.

## Code

- TypeScript strict; Zod for anything that crosses a boundary (API, URL params, runtime config).
- All user-facing text through `t()`; keys in `src/locales/en/*.json`.
- Respect the import boundaries (routes → features → components/shared → components/ui → lib). Lint enforces part of this.
- Never edit `src/api/generated/**` or `src/routeTree.gen.ts`.
- New tier 1/2 components need stories; logic needs tests; a bug fix needs a test that failed before.

## Before a PR

```bash
pnpm format && pnpm lint && pnpm typecheck && pnpm test
```

Husky runs format and lint on staged files and checks the commit message. A PR is merged only when CI is green.
