import { http, HttpResponse } from 'msw';
import { z } from 'zod';

import type { ApiSpec, ApiSpecSummary, Endpoint } from '@/features/collections/api';

import { coreError } from './core-error';

type Parameter = Endpoint['parameters'][number];
type BodyField = NonNullable<NonNullable<Endpoint['requestBody']>['fields']>[number];

type MockParameter = Omit<Parameter, 'required' | 'schema'> &
    Partial<Pick<Parameter, 'required' | 'schema'>>;

type MockEndpoint = Omit<Endpoint, 'id' | 'key' | 'parameters' | 'tags' | 'responses'> & {
    parameters?: MockParameter[];
    tags?: string[];
};

const endpointId = (key: string) => key.replaceAll(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '');

const parameter = (value: MockParameter): Parameter => ({ required: false, schema: {}, ...value });

const endpoint = ({ parameters = [], ...value }: MockEndpoint): Endpoint => {
    const key = `${value.method} ${value.path}`;
    return {
        id: endpointId(key),
        key,
        tags: [],
        responses: [{ status: '200', description: 'OK' }],
        ...value,
        parameters: parameters.map(parameter),
    };
};

const bearer: MockParameter = {
    name: 'Authorization',
    in: 'header',
    required: true,
    description: 'Bearer token',
};
const taskId: MockParameter = {
    name: 'id',
    in: 'path',
    required: true,
    schema: { type: 'integer', example: 1 },
};

const json = (example: unknown, fields: BodyField[] = []) => ({
    required: true,
    contentType: 'application/json',
    example: JSON.stringify(example, null, 2),
    ...(fields.length > 0 ? { fields } : {}),
});

export const testServerSpec: ApiSpec = {
    id: '4f1c2b7a-9e3d-4a51-8c6f-0d2e7b9a1c35',
    name: 'LoadAPI test server',
    title: 'LoadAPI test server',
    version: '1.0.0',
    description: 'Predictable target for load tests and scenario demos.',
    createdAt: '2026-11-05T14:40:00.000Z',
    servers: [{ url: 'http://testserver:8080' }, { url: 'http://localhost:8080' }],
    endpoints: [
        endpoint({
            method: 'GET',
            path: '/fixed',
            summary: 'Respond after a fixed delay with a body of a given size',
            tags: ['load'],
            parameters: [
                { name: 'delay', in: 'query', schema: { type: 'string', example: '10ms' } },
                { name: 'size', in: 'query', schema: { type: 'integer', example: 1024 } },
            ],
        }),
        endpoint({
            method: 'GET',
            path: '/status/{code}',
            summary: 'Respond with the given status code and an empty body',
            tags: ['load'],
            parameters: [
                {
                    name: 'code',
                    in: 'path',
                    required: true,
                    schema: { type: 'integer', example: 429 },
                },
            ],
        }),
        endpoint({
            method: 'GET',
            path: '/flaky',
            summary: 'Respond 500 with probability errorRate, otherwise 200',
            tags: ['load'],
            parameters: [
                { name: 'errorRate', in: 'query', schema: { type: 'number', example: 0.05 } },
            ],
        }),
        endpoint({
            method: 'POST',
            path: '/auth/login',
            summary: 'Get an access token',
            tags: ['scenario'],
            requestBody: json({ email: 'demo@example.com', password: 'secret' }),
        }),
        endpoint({
            method: 'POST',
            path: '/tasks',
            summary: 'Create a task',
            tags: ['scenario'],
            parameters: [bearer],
            requestBody: json({ title: 'task-{{$uuid}}' }),
        }),
        endpoint({
            method: 'GET',
            path: '/tasks/{id}',
            summary: 'Get a task of the current user',
            tags: ['scenario'],
            parameters: [taskId, bearer],
        }),
        endpoint({
            method: 'PATCH',
            path: '/tasks/{id}',
            summary: 'Update the title and/or status of a task',
            tags: ['scenario'],
            parameters: [taskId, bearer],
            requestBody: json({ status: 'done' }),
        }),
        endpoint({
            method: 'DELETE',
            path: '/tasks/{id}',
            summary: 'Delete a task',
            tags: ['scenario'],
            parameters: [taskId, bearer],
        }),
        endpoint({
            method: 'POST',
            path: '/users',
            summary: 'Register a user; a repeated email gives 409',
            tags: ['templating'],
            requestBody: json({ email: '{{$randomEmail}}', name: 'Demo' }, [
                { path: 'email', type: 'string', format: 'email', required: true },
                { path: 'name', type: 'string', required: true },
            ]),
        }),
        endpoint({
            method: 'GET',
            path: '/admin/stats',
            summary: 'Requests per second',
            tags: ['admin'],
        }),
        endpoint({
            method: 'POST',
            path: '/admin/reset',
            summary: 'Reset counters',
            tags: ['admin'],
        }),
    ],
};

export const shopSpec: ApiSpec = {
    id: '0b7e4a52-3c1d-4f8e-9a6b-5d2c1e0f9a37',
    name: 'Shop API',
    title: 'Shop API',
    version: '2.1.0',
    description: 'Products and orders',
    createdAt: '2026-11-05T15:02:11.304Z',
    servers: [
        { url: 'https://api.shop.example.com/v2' },
        { url: 'http://localhost:4000/v2' },
        { url: '/v2', relative: true },
    ],
    endpoints: [
        endpoint({
            method: 'GET',
            path: '/products',
            summary: 'List products',
            tags: ['products'],
        }),
        endpoint({
            method: 'GET',
            path: '/products/{productId}',
            summary: 'Get a product',
            tags: ['products'],
            parameters: [
                {
                    name: 'productId',
                    in: 'path',
                    required: true,
                    schema: { type: 'string', format: 'uuid' },
                },
            ],
        }),
        endpoint({
            method: 'DELETE',
            path: '/products/{productId}',
            summary: 'Delete a product',
            tags: ['products'],
            deprecated: true,
            parameters: [
                {
                    name: 'productId',
                    in: 'path',
                    required: true,
                    schema: { type: 'string', format: 'uuid' },
                },
                bearer,
            ],
        }),
        endpoint({
            method: 'POST',
            path: '/orders',
            summary: 'Create an order',
            tags: ['orders'],
            parameters: [bearer],
            requestBody: json(
                {
                    productId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
                    quantity: 1,
                    comment: 'string',
                },
                [
                    { path: 'productId', type: 'string', format: 'uuid', required: true },
                    { path: 'quantity', type: 'integer', required: true },
                    { path: 'comment', type: 'string', required: false },
                ],
            ),
        }),
        endpoint({ method: 'GET', path: '/health', summary: 'Health check' }),
    ],
};

const seededSpecs: ApiSpec[] = [shopSpec, testServerSpec];

export const mockApiSpecs: ApiSpec[] = [...seededSpecs];

export function resetMockApiSpecs() {
    mockApiSpecs.splice(0, mockApiSpecs.length, ...seededSpecs);
}

function syntaxError(line: number, column: number, message: string) {
    return HttpResponse.json(
        {
            success: false,
            error: {
                code: 'API_SPEC.INVALID_SYNTAX',
                message: 'The file is not valid YAML or JSON',
                retryable: false,
            },
            details: [{ field: 'content', message, code: 'yaml_syntax', line, column }],
        },
        { status: 400 },
    );
}

function importSpec(content: string, name: string | undefined): Response {
    const text = content.trim();
    if (text.startsWith('{')) {
        try {
            JSON.parse(text);
        } catch {
            return syntaxError(1, 1, 'unexpected token in JSON');
        }
    }
    const tabLine = content.split('\n').findIndex((line) => line.startsWith('\t'));
    if (tabLine !== -1) {
        return syntaxError(tabLine + 1, 1, 'tabs are not allowed for indentation');
    }
    if (/\bswagger\b/.test(text) || !/\bopenapi\b/.test(text)) {
        return coreError(
            400,
            'API_SPEC.UNSUPPORTED_VERSION',
            'Only OpenAPI 3.0 and 3.1 documents are supported',
        );
    }
    if (!/\bpaths\b/.test(text)) {
        return HttpResponse.json(
            {
                success: false,
                error: {
                    code: 'API_SPEC.INVALID',
                    message: 'The file is not a valid OpenAPI document',
                    retryable: false,
                },
                details: [{ field: 'paths', message: 'is required', code: 'invalid_spec' }],
            },
            { status: 400 },
        );
    }
    const title = /"?title"?\s*:\s*"?([^"\n,]+)"?/.exec(text)?.[1]?.trim() ?? 'Imported API';
    const spec: ApiSpec = {
        ...testServerSpec,
        id: crypto.randomUUID(),
        name: name ?? title,
        title,
        createdAt: new Date().toISOString(),
    };
    mockApiSpecs.unshift(spec);
    return HttpResponse.json(spec, { status: 201 });
}

export const toSummary = (spec: ApiSpec): ApiSpecSummary => ({
    id: spec.id,
    name: spec.name,
    title: spec.title,
    version: spec.version,
    endpointsCount: spec.endpoints.length,
    createdAt: spec.createdAt,
});

export const apiSpecHandlers = [
    http.post('*/v1/api-specs', async ({ request }) => {
        const body = z
            .object({ name: z.string().optional(), content: z.string().default('') })
            .parse(await request.json());
        return importSpec(body.content, body.name);
    }),
    http.get('*/v1/api-specs', () => HttpResponse.json(mockApiSpecs.map(toSummary))),
    http.get('*/v1/api-specs/:id', ({ params }) => {
        const spec = mockApiSpecs.find((candidate) => candidate.id === params.id);
        return spec
            ? HttpResponse.json(spec)
            : coreError(404, 'API_SPEC.NOT_FOUND', 'API spec not found');
    }),
];
