import { queryOptions } from '@tanstack/react-query';
import { z } from 'zod';

import { apiFetch } from '@/api/fetcher';
import { config } from '@/config';

export const oauthProvidersSchema = z.array(z.object({ id: z.string(), name: z.string() }));

export type OAuthProvider = z.infer<typeof oauthProvidersSchema>[number];

export const oauthProvidersQuery = queryOptions({
    queryKey: ['oauth', 'providers'],
    queryFn: async ({ signal }) =>
        oauthProvidersSchema.parse(await apiFetch('/v1/oauth/providers', { signal })),
    staleTime: Infinity,
});

export function oauthStartUrl(providerId: string) {
    return config.apiMocking
        ? '/oauth/callback'
        : `${config.apiBase}/v1/oauth/${encodeURIComponent(providerId)}`;
}
