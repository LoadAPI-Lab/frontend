import { queryOptions } from '@tanstack/react-query';
import { z } from 'zod';

import { apiFetch } from '@/api/fetcher';
import { HTTP_METHODS } from '@/lib/http-method';

export const apiSpecSummarySchema = z.object({
    id: z.string(),
    name: z.string(),
    title: z.string().optional(),
    version: z.string().optional(),
    endpointsCount: z.number(),
    createdAt: z.string(),
});

const parameterSchema = z.object({
    name: z.string(),
    in: z.enum(['path', 'query', 'header', 'cookie']),
    required: z.boolean().optional(),
    description: z.string().optional(),
    schema: z.record(z.string(), z.unknown()).optional(),
});

export const endpointSchema = z.object({
    key: z.string(),
    method: z.enum(HTTP_METHODS),
    path: z.string(),
    summary: z.string().optional(),
    tags: z.array(z.string()).default([]),
    deprecated: z.boolean().optional(),
    parameters: z.array(parameterSchema).default([]),
    requestBody: z
        .object({
            required: z.boolean().optional(),
            contentType: z.string(),
            example: z.string().optional(),
            fields: z
                .array(
                    z.object({
                        path: z.string(),
                        type: z.string().optional(),
                        format: z.string().optional(),
                        required: z.boolean().optional(),
                    }),
                )
                .default([]),
        })
        .optional(),
});

export const apiSpecSchema = apiSpecSummarySchema.omit({ endpointsCount: true }).extend({
    description: z.string().optional(),
    servers: z.array(z.object({ url: z.string(), description: z.string().optional() })).default([]),
    endpoints: z.array(endpointSchema),
});

export type ApiSpecSummary = z.infer<typeof apiSpecSummarySchema>;
export type ApiSpec = z.infer<typeof apiSpecSchema>;
export type Endpoint = z.infer<typeof endpointSchema>;

export const apiSpecKeys = {
    all: ['api-specs'] as const,
    detail: (id: string) => ['api-specs', id] as const,
};

export const apiSpecsQuery = queryOptions({
    queryKey: apiSpecKeys.all,
    queryFn: async ({ signal }) =>
        z.array(apiSpecSummarySchema).parse(await apiFetch('/v1/api-specs', { signal })),
});

export const apiSpecQuery = (id: string) =>
    queryOptions({
        queryKey: apiSpecKeys.detail(id),
        queryFn: async ({ signal }) =>
            apiSpecSchema.parse(
                await apiFetch(`/v1/api-specs/${encodeURIComponent(id)}`, { signal }),
            ),
        staleTime: 5 * 60_000,
    });
