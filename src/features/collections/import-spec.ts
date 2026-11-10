import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { ApiError } from '@/api/fetcher';
import {
    apiSpecsDelete,
    apiSpecsImport,
    apiSpecsRename,
    apiSpecsUpdateContent,
} from '@/api/generated/endpoints/api-specs/api-specs';
import type { UpdatedApiSpecResponseDtoChanges } from '@/api/generated/model';

import { apiSpecKeys, type ApiSpec, type ApiSpecSummary, apiSpecsQuery } from './api';

export type SpecChanges = UpdatedApiSpecResponseDtoChanges;

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

export interface SavedSpec {
    spec: ApiSpec;
    changes: SpecChanges | null;
}

async function saveSpec(
    { name, content }: ImportSpecInput,
    replacing: ApiSpecSummary | undefined,
): Promise<SavedSpec> {
    const body = name ? { name, content } : { content };
    if (!replacing) {
        return { spec: await apiSpecsImport(body), changes: null };
    }
    const { changes, ...spec } = await apiSpecsUpdateContent(replacing.id, body);
    return { spec, changes };
}

export function useImportSpec(onImported: (saved: SavedSpec) => void, replacing?: ApiSpecSummary) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (input: ImportSpecInput) => saveSpec(input, replacing),
        meta: { toastOnError: false },
        onSuccess: async (saved) => {
            queryClient.setQueryData(apiSpecKeys.detail(saved.spec.id), saved.spec);
            await queryClient.invalidateQueries({ queryKey: apiSpecKeys.all, exact: true });
            onImported(saved);
        },
    });
}

export function useDeleteSpec(onDeleted: (spec: ApiSpecSummary) => void) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (spec: ApiSpecSummary) => {
            await apiSpecsDelete(spec.id);
            return spec;
        },
        onSuccess: async (spec) => {
            queryClient.setQueryData(apiSpecsQuery.queryKey, (specs) =>
                specs?.filter((candidate) => candidate.id !== spec.id),
            );
            queryClient.removeQueries({ queryKey: apiSpecKeys.detail(spec.id), exact: true });
            onDeleted(spec);
            await queryClient.invalidateQueries({ queryKey: apiSpecKeys.all, exact: true });
        },
    });
}

export const MAX_SPEC_NAME = 255;

export function useRenameSpec(onRenamed: (spec: ApiSpecSummary) => void) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, name }: { id: string; name: string }) => apiSpecsRename(id, { name }),
        onSuccess: async (renamed) => {
            queryClient.setQueryData(apiSpecsQuery.queryKey, (specs) =>
                specs?.map((spec) => (spec.id === renamed.id ? { ...spec, ...renamed } : spec)),
            );
            queryClient.setQueryData(apiSpecKeys.detail(renamed.id), (spec?: ApiSpec) =>
                spec ? { ...spec, name: renamed.name } : spec,
            );
            onRenamed(renamed);
            await queryClient.invalidateQueries({ queryKey: apiSpecKeys.all, exact: true });
        },
    });
}
