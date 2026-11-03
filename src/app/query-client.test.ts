import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError, apiFetch } from '@/api/fetcher';
import { toastManager } from '@/components/ui/toast';
import { server } from '@/mocks/server';

import { createQueryClient } from './query-client';

afterEach(() => vi.restoreAllMocks());

describe('query client', () => {
    it('toasts core’s message when a mutation fails', async () => {
        const add = vi.spyOn(toastManager, 'add');
        server.use(
            http.post('*/api/v1/test-runs', () =>
                HttpResponse.json(
                    { message: 'Too many test runs are in progress, try again later' },
                    { status: 503 },
                ),
            ),
        );
        const client = createQueryClient();
        await expect(
            client
                .getMutationCache()
                .build(client, {
                    mutationFn: (body: string) =>
                        apiFetch('/v1/test-runs', { method: 'POST', body }),
                })
                .execute('{}'),
        ).rejects.toBeInstanceOf(ApiError);
        expect(add).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'error',
                description: 'Too many test runs are in progress, try again later',
            }),
        );
    });

    it('stays quiet for mutations that opt out', async () => {
        const add = vi.spyOn(toastManager, 'add');
        server.use(
            http.post('*/api/v1/auth/sign-out', () => new HttpResponse(null, { status: 500 })),
        );
        const client = createQueryClient();
        await expect(
            client
                .getMutationCache()
                .build(client, {
                    mutationFn: (body: string) =>
                        apiFetch('/v1/auth/sign-out', { method: 'POST', body }),
                    meta: { toastOnError: false },
                })
                .execute('{}'),
        ).rejects.toBeInstanceOf(ApiError);
        expect(add).not.toHaveBeenCalled();
    });
});
