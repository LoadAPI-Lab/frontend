import { http, HttpResponse } from 'msw';

import { getAuthMock } from '@/api/generated/endpoints/auth/auth.msw';
import { getOauthMock } from '@/api/generated/endpoints/oauth/oauth.msw';
import { getUsersMock } from '@/api/generated/endpoints/users/users.msw';

import { apiSpecHandlers } from './api-specs';
import { mockProviders, mockUser } from './data';
import { requestHandlers } from './requests';
import { testRunHandlers } from './test-runs';

export const handlers = [
    http.get('*/v1/users/me', () => HttpResponse.json(mockUser)),
    http.get('*/v1/oauth/providers', () => HttpResponse.json(mockProviders)),
    http.post('*/v1/auth/refresh', () => new HttpResponse(null, { status: 204 })),
    http.post('*/v1/auth/logout', () => new HttpResponse(null, { status: 204 })),
    ...apiSpecHandlers,
    ...testRunHandlers,
    ...requestHandlers,
    ...getAuthMock(),
    ...getOauthMock(),
    ...getUsersMock(),
];
