import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { server } from '@/mocks/server';

afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
});

async function loadSessionQuery() {
    const { sessionQuery } = await import('./session');
    const queryFn = sessionQuery.queryFn;
    if (typeof queryFn !== 'function') {
        throw new TypeError('sessionQuery has no queryFn');
    }
    return queryFn;
}

const context = { signal: new AbortController().signal } as Parameters<
    Awaited<ReturnType<typeof loadSessionQuery>>
>[0];

describe('sessionQuery', () => {
    it('asks core for the signed-in user', async () => {
        server.use(
            http.get('*/api/v1/auth/me', () =>
                HttpResponse.json({ id: 'u1', name: 'Ada Lovelace', email: 'ada@example.com' }),
            ),
        );
        const queryFn = await loadSessionQuery();
        await expect(queryFn(context)).resolves.toMatchObject({ id: 'u1' });
    });

    it('returns the local dev user when the dev-only bypass is on', async () => {
        vi.stubEnv('VITE_AUTH_BYPASS', 'true');
        vi.resetModules();
        const queryFn = await loadSessionQuery();
        await expect(queryFn(context)).resolves.toMatchObject({ id: 'dev-user' });
    });
});
