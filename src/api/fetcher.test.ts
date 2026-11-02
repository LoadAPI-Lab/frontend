import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { server } from '@/mocks/server';

import { apiFetch, ApiError } from './fetcher';

describe('apiFetch', () => {
    it('calls core through the same-origin /api base and parses JSON', async () => {
        server.use(http.get('*/api/v1/ping', () => HttpResponse.json({ ok: true })));
        await expect(apiFetch('/v1/ping')).resolves.toEqual({ ok: true });
    });

    it('throws ApiError with status, message and request id', async () => {
        server.use(
            http.get('*/api/v1/secret', () =>
                HttpResponse.json(
                    { message: 'Unauthorized' },
                    { status: 401, headers: { 'x-request-id': 'req_123' } },
                ),
            ),
        );
        const error = await apiFetch('/v1/secret').catch((error_: unknown) => error_);
        expect(error).toBeInstanceOf(ApiError);
        expect(error).toMatchObject({ status: 401, message: 'Unauthorized', requestId: 'req_123' });
    });

    it('marks requests as XHR for the CSRF check', async () => {
        let header: string | null = null;
        server.use(
            http.post('*/api/v1/echo', ({ request }) => {
                header = request.headers.get('x-requested-with');
                return new HttpResponse(null, { status: 204 });
            }),
        );
        await apiFetch('/v1/echo', { method: 'POST', body: '{}' });
        expect(header).toBe('XMLHttpRequest');
    });
});
