# OpenAPI contract

The backend team owns the contract. Put core's exported spec here as `openapi.json`
(from `http://localhost:3001/docs/json` on a running core), then run:

```bash
pnpm api:generate
```

orval writes typed TanStack Query hooks, Zod schemas and MSW mock handlers to `src/api/generated/`.
Commit the spec and the generated code together in one `chore(api): sync openapi` commit.
