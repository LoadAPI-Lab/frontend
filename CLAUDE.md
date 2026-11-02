# LoadAPI frontend

React SPA for LoadAPI (routelab). Backend: LoadAPI-Lab/backend (NestJS core + Go worker); the browser calls core on the same origin under `/api`.

Read the project skills before working: `.claude/skills/frontend-conventions`, `ui-components`, `api-and-live-data`, `testing`.

Key rules:

- pnpm only. Check: `pnpm format && pnpm lint && pnpm typecheck && pnpm test`.
- v1: Single stress tests only (Batch/Round-robin behind flags), desktop only, all UI text via i18next `t()`.
- Never edit `src/api/generated/**` or `src/routeTree.gen.ts`.
- Branch from `dev`, Conventional Commits, PR into `dev`.
