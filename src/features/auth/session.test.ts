import { QueryClient } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { server } from '@/mocks/server';

afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
});

// Import fresh each time: `config.authBypass` is read when the module loads.
async function fetchSession() {
    const { sessionQuery } = await import('./session');
    return new QueryClient().fetchQuery(sessionQuery);
}

describe('sessionQuery', () => {
    it('asks core for the signed-in user', async () => {
        server.use(
            http.get('*/api/v1/auth/me', () =>
                HttpResponse.json({ id: 'u1', name: 'Ada Lovelace', email: 'ada@example.com' }),
            ),
        );
        await expect(fetchSession()).resolves.toMatchObject({ id: 'u1' });
    });

    it('returns the local dev user when the dev-only bypass is on', async () => {
        vi.stubEnv('VITE_AUTH_BYPASS', 'true');
        await expect(fetchSession()).resolves.toMatchObject({ id: 'dev-user' });
    });
});
