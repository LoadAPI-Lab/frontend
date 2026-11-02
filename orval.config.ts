import { defineConfig } from 'orval';

// The backend owns the contract. Drop its exported spec into openapi/openapi.json
// (or point OPENAPI_URL at a running core, e.g. http://localhost:3001/docs/json) and run `pnpm api:generate`.
const input = { target: process.env.OPENAPI_URL ?? './openapi/openapi.json' };

export default defineConfig({
    loadapi: {
        input,
        output: {
            mode: 'tags-split',
            target: 'src/api/generated/endpoints',
            schemas: 'src/api/generated/model',
            client: 'react-query',
            httpClient: 'fetch',
            mock: true,
            clean: true,
            override: {
                mutator: { path: 'src/api/fetcher.ts', name: 'orvalFetch' },
                // our fetcher returns the parsed body, not { data, status, headers }
                fetch: { includeHttpResponseReturnType: false },
            },
        },
    },
    loadapiZod: {
        input,
        output: {
            mode: 'tags-split',
            target: 'src/api/generated/zod',
            client: 'zod',
            fileExtension: '.zod.ts',
        },
    },
});
