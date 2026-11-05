import { http, HttpResponse } from 'msw';

import type { ApiSpec, ApiSpecSummary, Endpoint } from '@/features/collections/api';

import { coreError } from './core-error';

type MockEndpoint = Omit<Endpoint, 'key' | 'parameters' | 'tags'> &
    Partial<Pick<Endpoint, 'parameters' | 'tags'>>;

const endpoint = (value: MockEndpoint): Endpoint => ({
    key: `${value.method} ${value.path}`,
    tags: [],
    parameters: [],
    ...value,
});

const bearer = {
    name: 'Authorization',
    in: 'header',
    required: true,
    description: 'Bearer token',
} as const;
const taskId = {
    name: 'id',
    in: 'path',
    required: true,
    schema: { type: 'integer', example: 1 },
} as const;
const json = (example: unknown) => ({
    required: true,
    contentType: 'application/json',
    example: JSON.stringify(example, null, 2),
});

export const testServerSpec: ApiSpec = {
    id: '4f1c2b7a-9e3d-4a51-8c6f-0d2e7b9a1c35',
    name: 'LoadAPI test server',
    title: 'LoadAPI test server',
    version: '1.0.0',
    description: 'Predictable target for load tests and scenario demos.',
    createdAt: '2026-11-05T14:40:00.000Z',
    servers: [
        {
            url: 'http://testserver:8080',
            description: 'From containers in the Docker network (LoadAPI worker)',
        },
        { url: 'http://localhost:8080', description: 'From the host machine' },
    ],
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
            requestBody: json({ email: '{{$randomEmail}}', name: 'Demo' }),
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
        { url: 'https://api.shop.example.com/v2', description: 'Production' },
        { url: 'http://localhost:4000/v2', description: 'Local' },
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
            requestBody: json({ productId: '3fa85f64-5717-4562-b3fc-2c963f66afa6', quantity: 1 }),
        }),
        endpoint({ method: 'GET', path: '/health', summary: 'Health check' }),
    ],
};

export const mockApiSpecs: ApiSpec[] = [shopSpec, testServerSpec];

export const toSummary = (spec: ApiSpec): ApiSpecSummary => ({
    id: spec.id,
    name: spec.name,
    title: spec.title,
    version: spec.version,
    endpointsCount: spec.endpoints.length,
    createdAt: spec.createdAt,
});

export const apiSpecHandlers = [
    http.get('*/v1/api-specs', () => HttpResponse.json(mockApiSpecs.map(toSummary))),
    http.get('*/v1/api-specs/:id', ({ params }) => {
        const spec = mockApiSpecs.find((candidate) => candidate.id === params.id);
        return spec
            ? HttpResponse.json(spec)
            : coreError(404, 'API_SPEC.NOT_FOUND', 'API spec not found');
    }),
];
