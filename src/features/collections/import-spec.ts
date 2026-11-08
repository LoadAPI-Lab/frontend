import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { ApiError, apiFetch } from '@/api/fetcher';

import { apiSpecKeys, type ApiSpec, apiSpecSchema } from './api';

export const MAX_SPEC_BYTES = 5 * 1024 * 1024;

export const specBytes = (content: string) => new TextEncoder().encode(content).length;

export type ImportIssue =
    | { kind: 'syntax'; line: number | null; column: number | null; detail: string | null }
    | { kind: 'invalid'; problems: { field: string; message: string }[] }
    | { kind: 'unsupportedVersion' }
    | { kind: 'tooLarge' }
    | { kind: 'other'; message: string };

const detailsSchema = z.object({
    details: z
        .array(
            z.object({
                field: z.string().default(''),
                message: z.string(),
                line: z.number().optional(),
                column: z.number().optional(),
            }),
        )
        .default([]),
});

export function importIssue(error: unknown): ImportIssue {
    if (!(error instanceof ApiError)) {
        return { kind: 'other', message: error instanceof Error ? error.message : String(error) };
    }
    const parsed = detailsSchema.safeParse(error.body);
    const details = parsed.success ? parsed.data.details : [];
    if (error.code === 'API_SPEC.INVALID_SYNTAX') {
        const [first] = details;
        return {
            kind: 'syntax',
            line: first?.line ?? null,
            column: first?.column ?? null,
            detail: first?.message ?? null,
        };
    }
    if (error.code === 'API_SPEC.INVALID') {
        return {
            kind: 'invalid',
            problems: details.map(({ field, message }) => ({ field, message })),
        };
    }
    if (error.code === 'API_SPEC.UNSUPPORTED_VERSION') {
        return { kind: 'unsupportedVersion' };
    }
    if (error.code === 'API_SPEC.TOO_LARGE' || error.status === 413) {
        return { kind: 'tooLarge' };
    }
    return { kind: 'other', message: error.message };
}

export function offsetOf(text: string, line: number, column: number): number {
    const lines = text.split('\n');
    const before = lines
        .slice(0, Math.max(0, line - 1))
        .reduce((sum, current) => sum + current.length + 1, 0);
    const lineLength = lines[line - 1]?.length ?? 0;
    return Math.min(text.length, before + Math.min(Math.max(0, column - 1), lineLength));
}

export interface ImportSpecInput {
    name?: string;
    content: string;
}

export function useImportSpec(onImported: (spec: ApiSpec) => void) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ name, content }: ImportSpecInput) =>
            apiSpecSchema.parse(
                await apiFetch('/v1/api-specs', {
                    method: 'POST',
                    body: JSON.stringify(name ? { name, content } : { content }),
                }),
            ),
        meta: { toastOnError: false },
        onSuccess: async (spec) => {
            queryClient.setQueryData(apiSpecKeys.detail(spec.id), spec);
            await queryClient.invalidateQueries({ queryKey: apiSpecKeys.all, exact: true });
            onImported(spec);
        },
    });
}
