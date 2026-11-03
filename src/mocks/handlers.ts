import { http, HttpResponse } from 'msw';

import { mockUser } from './data';

// Hand-written handlers. Once `pnpm api:generate` runs, spread the orval-generated
// handlers in here as well and keep only overrides and the SSE mock by hand.
export const handlers = [
    http.get('*/api/v1/auth/me', () => HttpResponse.json(mockUser)),
    http.post('*/api/v1/auth/sign-out', () => new HttpResponse(null, { status: 204 })),
];
