import { queryOptions } from '@tanstack/react-query';
import type { z } from 'zod';

import {
    getOauthProvidersQueryKey,
    getOauthStartUrl,
    oauthProviders,
} from '@/api/generated/endpoints/oauth/oauth';
import { OauthProvidersResponse } from '@/api/generated/zod/oauth/oauth.zod';
import { config } from '@/config';

export const oauthProvidersSchema = OauthProvidersResponse;

export type OAuthProvider = z.infer<typeof oauthProvidersSchema>[number];

export const oauthProvidersQuery = queryOptions({
    queryKey: getOauthProvidersQueryKey(),
    queryFn: async ({ signal }) => oauthProvidersSchema.parse(await oauthProviders({ signal })),
    staleTime: Infinity,
});

export function oauthStartUrl(providerId: OAuthProvider['id']) {
    return config.apiMocking
        ? '/oauth/callback'
        : `${config.apiBase}${getOauthStartUrl(providerId)}`;
}
