import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { coreError } from '@/mocks/core-error';
import { server } from '@/mocks/server';

import { apiFetch, ApiError, errorCode } from './fetcher';

const unauthorized = () => coreError(401, 'AUTH.UNAUTHENTICATED', 'Sign in');

describe('apiFetch', () => {
    it('calls core’s own paths on the same origin and parses JSON', async () => {
        let url = '';
        server.use(
            http.get('*/v1/ping', ({ request }) => {
                url = request.url;
                return HttpResponse.json({ ok: true });
            }),
        );
        await expect(apiFetch('/v1/ping')).resolves.toEqual({ ok: true });
        expect(new URL(url).pathname).toBe('/v1/ping');
    });

    it('throws ApiError with status, message, request id and code', async () => {
        server.use(
            http.get('*/v1/runs/x', () =>
                coreError(404, 'TEST_RUN.NOT_FOUND', 'Test run not found', 'req_123'),
            ),
        );
        const error = await apiFetch('/v1/runs/x').catch((error_: unknown) => error_);
        expect(error).toBeInstanceOf(ApiError);
        expect(error).toMatchObject({
            status: 404,
            message: 'Test run not found',
            requestId: 'req_123',
            code: 'TEST_RUN.NOT_FOUND',
        });
        expect(errorCode(error)).toBe('TEST_RUN.NOT_FOUND');
    });

    it('marks requests as XHR', async () => {
        let header: string | null = null;
        server.use(
            http.post('*/v1/echo', ({ request }) => {
                header = request.headers.get('x-requested-with');
                return new HttpResponse(null, { status: 204 });
            }),
        );
        await apiFetch('/v1/echo', { method: 'POST', body: '{}' });
        expect(header).toBe('XMLHttpRequest');
    });

    it('refreshes the session once on 401 and retries', async () => {
        let refreshed = false;
        server.use(
            http.get('*/v1/users/me', () =>
                refreshed ? HttpResponse.json({ id: 'u1' }) : unauthorized(),
            ),
            http.post('*/v1/auth/refresh', () => {
                refreshed = true;
                return new HttpResponse(null, { status: 204 });
            }),
        );
        await expect(apiFetch('/v1/users/me')).resolves.toEqual({ id: 'u1' });
    });

    it('shares one refresh between requests that fail together', async () => {
        let refreshes = 0;
        server.use(
            http.get('*/v1/a', () => (refreshes ? HttpResponse.json('a') : unauthorized())),
            http.get('*/v1/b', () => (refreshes ? HttpResponse.json('b') : unauthorized())),
            http.post('*/v1/auth/refresh', () => {
                refreshes += 1;
                return new HttpResponse(null, { status: 204 });
            }),
        );
        await expect(Promise.all([apiFetch('/v1/a'), apiFetch('/v1/b')])).resolves.toEqual([
            'a',
            'b',
        ]);
        expect(refreshes).toBe(1);
    });

    it('throws the 401 when the refresh fails too', async () => {
        server.use(
            http.get('*/v1/users/me', unauthorized),
            http.post('*/v1/auth/refresh', () =>
                coreError(
                    401,
                    'AUTH.SESSION_INVALID',
                    'The session is invalid or has expired, sign in again',
                ),
            ),
        );
        const error = await apiFetch('/v1/users/me').catch((error_: unknown) => error_);
        expect(error).toMatchObject({ status: 401 });
        expect(errorCode(error)).toBe('AUTH.UNAUTHENTICATED');
    });

    it('never refreshes for the auth endpoints themselves', async () => {
        let refreshes = 0;
        server.use(
            http.post('*/v1/auth/logout', unauthorized),
            http.post('*/v1/auth/refresh', () => {
                refreshes += 1;
                return new HttpResponse(null, { status: 204 });
            }),
        );
        await expect(apiFetch('/v1/auth/logout', { method: 'POST' })).rejects.toMatchObject({
            status: 401,
        });
        expect(refreshes).toBe(0);
    });

    it('falls back to the status text and header for errors that are not from core', async () => {
        server.use(
            http.get(
                '*/v1/proxy',
                () =>
                    new HttpResponse('Bad gateway', {
                        status: 502,
                        statusText: 'Bad Gateway',
                        headers: { 'x-request-id': 'req_proxy' },
                    }),
            ),
        );
        const error = await apiFetch('/v1/proxy').catch((error_: unknown) => error_);
        expect(error).toMatchObject({
            status: 502,
            message: 'Bad Gateway',
            requestId: 'req_proxy',
        });
        expect(errorCode(error)).toBeUndefined();
    });
});
