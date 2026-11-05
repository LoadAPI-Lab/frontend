import { http, HttpResponse } from 'msw';

import { getAuthMock } from '@/api/generated/endpoints/auth/auth.msw';
import { getOauthMock } from '@/api/generated/endpoints/oauth/oauth.msw';
import { getTestRunsMock } from '@/api/generated/endpoints/test-runs/test-runs.msw';
import { getUsersMock } from '@/api/generated/endpoints/users/users.msw';

import { mockProviders, mockUser } from './data';

export const handlers = [
    http.get('*/v1/users/me', () => HttpResponse.json(mockUser)),
    http.get('*/v1/oauth/providers', () => HttpResponse.json(mockProviders)),
    http.post('*/v1/auth/refresh', () => new HttpResponse(null, { status: 204 })),
    http.post('*/v1/auth/logout', () => new HttpResponse(null, { status: 204 })),
    ...getAuthMock(),
    ...getOauthMock(),
    ...getTestRunsMock(),
    ...getUsersMock(),
];
