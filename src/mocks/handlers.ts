import { http, HttpResponse } from 'msw';

import { mockProviders, mockUser } from './data';

export const handlers = [
    http.get('*/v1/users/me', () => HttpResponse.json(mockUser)),
    http.get('*/v1/oauth/providers', () => HttpResponse.json(mockProviders)),
    http.post('*/v1/auth/refresh', () => new HttpResponse(null, { status: 204 })),
    http.post('*/v1/auth/logout', () => new HttpResponse(null, { status: 204 })),
];
