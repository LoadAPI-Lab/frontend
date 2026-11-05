import { QueryClient } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { server } from '@/mocks/server';

import { sessionQuery } from './session';

describe('sessionQuery', () => {
    it('asks core for the signed-in user', async () => {
        server.use(
            http.get('*/v1/users/me', () =>
                HttpResponse.json({
                    id: 'u1',
                    name: 'Ada Lovelace',
                    email: 'ada@example.com',
                    createdAt: '2026-11-01T10:00:00.000Z',
                }),
            ),
        );
        await expect(new QueryClient().fetchQuery(sessionQuery)).resolves.toMatchObject({
            id: 'u1',
            name: 'Ada Lovelace',
        });
    });
});
