import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError, apiFetch } from '@/api/fetcher';
import { getUsersMeQueryKey } from '@/api/generated/endpoints/users/users';
import { toastManager } from '@/components/ui/toast';
import { server } from '@/mocks/server';

import { createQueryClient } from './query-client';

afterEach(() => vi.restoreAllMocks());

describe('query client', () => {
    it('toasts core’s message when a mutation fails', async () => {
        const add = vi.spyOn(toastManager, 'add');
        server.use(
            http.post('*/v1/test-runs', () =>
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
        server.use(http.post('*/v1/auth/logout', () => new HttpResponse(null, { status: 500 })));
        const client = createQueryClient();
        await expect(
            client
                .getMutationCache()
                .build(client, {
                    mutationFn: (body: string) =>
                        apiFetch('/v1/auth/logout', { method: 'POST', body }),
                    meta: { toastOnError: false },
                })
                .execute('{}'),
        ).rejects.toBeInstanceOf(ApiError);
        expect(add).not.toHaveBeenCalled();
    });

    it('expires the session instead of toasting when a request is still 401', async () => {
        const add = vi.spyOn(toastManager, 'add');
        const onSessionExpired = vi.fn<() => void>();
        server.use(
            http.post('*/v1/collections', () =>
                HttpResponse.json({ code: 'AUTH.UNAUTHENTICATED' }, { status: 401 }),
            ),
            http.post('*/v1/auth/refresh', () => new HttpResponse(null, { status: 401 })),
        );
        const client = createQueryClient({ onSessionExpired });
        client.setQueryData(getUsersMeQueryKey(), { id: 'u1' });
        await expect(
            client
                .getMutationCache()
                .build(client, {
                    mutationFn: (body: string) =>
                        apiFetch('/v1/collections', { method: 'POST', body }),
                })
                .execute('{}'),
        ).rejects.toBeInstanceOf(ApiError);
        expect(onSessionExpired).toHaveBeenCalledOnce();
        expect(client.getQueryData(getUsersMeQueryKey())).toBeUndefined();
        expect(add).not.toHaveBeenCalled();
    });

    it('leaves the session query’s own 401 to the route guard', async () => {
        const onSessionExpired = vi.fn<() => void>();
        server.use(
            http.get('*/v1/users/me', () => new HttpResponse(null, { status: 401 })),
            http.post('*/v1/auth/refresh', () => new HttpResponse(null, { status: 401 })),
        );
        const client = createQueryClient({ onSessionExpired });
        await expect(
            client.fetchQuery({
                queryKey: getUsersMeQueryKey(),
                queryFn: () => apiFetch('/v1/users/me'),
                retry: false,
            }),
        ).rejects.toBeInstanceOf(ApiError);
        expect(onSessionExpired).not.toHaveBeenCalled();
    });
});
