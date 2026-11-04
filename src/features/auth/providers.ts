import { queryOptions } from '@tanstack/react-query';
import { z } from 'zod';

import { apiFetch } from '@/api/fetcher';
import { config } from '@/config';

// TODO(api): replace with the generated `getOAuthProviders` query once `pnpm api:generate` runs.
export const oauthProvidersSchema = z.array(z.object({ id: z.string(), name: z.string() }));

export type OAuthProvider = z.infer<typeof oauthProvidersSchema>[number];

/** Only the providers configured on core (client id and secret set). */
export const oauthProvidersQuery = queryOptions({
    queryKey: ['oauth', 'providers'],
    queryFn: async ({ signal }) =>
        oauthProvidersSchema.parse(await apiFetch('/v1/oauth/providers', { signal })),
    staleTime: Infinity,
});

/**
 * OAuth is done by core: a full-page navigation, never a fetch call. Core sets the session
 * cookies and redirects back to /oauth/callback. With mocking on there is no core to send
 * the user to (MSW can't answer page navigations), so go straight to the callback.
 */
export function oauthStartUrl(providerId: string) {
    return config.apiMocking
        ? '/oauth/callback'
        : `${config.apiBase}/v1/oauth/${encodeURIComponent(providerId)}`;
}
