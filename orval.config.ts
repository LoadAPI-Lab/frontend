import { defineConfig, defineTransformer } from 'orval';

const constToEnum = (node: unknown): void => {
    if (Array.isArray(node)) {
        node.forEach(constToEnum);
        return;
    }
    if (node === null || typeof node !== 'object') {
        return;
    }
    for (const [key, value] of Object.entries(node)) {
        if (key === 'const') {
            Reflect.deleteProperty(node, 'const');
            Object.assign(node, { enum: [value] });
        } else {
            constToEnum(value);
        }
    }
};

const input = {
    target: process.env.OPENAPI_URL ?? './openapi/openapi.json',
    filters: { mode: 'exclude' as const, tags: ['Health'] },
    override: {
        transformer: defineTransformer((spec) => {
            constToEnum(spec);
            return spec;
        }),
    },
};

const operationName = (operation: { operationId?: string }) => {
    const [controller = '', action = ''] = (operation.operationId ?? '')
        .replace(/_v\d+$/, '')
        .split('_');
    const resource = controller.replace(/Controller$/, '').replace(/^OAuth/, 'Oauth');
    return `${resource.charAt(0).toLowerCase()}${resource.slice(1)}${action.charAt(0).toUpperCase()}${action.slice(1)}`;
};

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
                operationName,
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
            override: { operationName },
        },
    },
});
