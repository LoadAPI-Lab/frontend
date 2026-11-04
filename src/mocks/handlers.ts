import { http, HttpResponse } from 'msw';

import { mockProviders, mockUser } from './data';

// Hand-written handlers. Once `pnpm api:generate` runs, spread the orval-generated
// handlers in here as well and keep only overrides and the SSE mock by hand.
// Patterns start with `*/v1`: the browser calls core's paths on its own origin.
export const handlers = [
    http.get('*/v1/users/me', () => HttpResponse.json(mockUser)),
    http.get('*/v1/oauth/providers', () => HttpResponse.json(mockProviders)),
    http.post('*/v1/auth/refresh', () => new HttpResponse(null, { status: 204 })),
    http.post('*/v1/auth/logout', () => new HttpResponse(null, { status: 204 })),
];
