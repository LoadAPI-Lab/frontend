import { defineConfig } from 'orval';

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
