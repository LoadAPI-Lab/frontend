import { queryOptions, useSuspenseQuery } from '@tanstack/react-query';
import { z } from 'zod';

import { apiFetch } from '@/api/fetcher';
import { config } from '@/config';

// TODO(api): replace with the generated `getMe` query once core publishes the auth contract.
export const sessionSchema = z.object({
    id: z.string(),
    name: z.string(),
    email: z.email(),
    avatarUrl: z.url().nullish(),
});

export type Session = z.infer<typeof sessionSchema>;

/** Local stand-in user for `pnpm dev:noauth`; never sent to the backend. */
export const devUser: Session = {
    id: 'dev-user',
    name: 'Dev User',
    email: 'dev.user@example.com',
    avatarUrl: null,
};

export const sessionQuery = queryOptions({
    queryKey: ['session'],
    queryFn: async ({ signal }) =>
        config.authBypass
            ? devUser
            : sessionSchema.parse(await apiFetch('/v1/auth/me', { signal })),
    staleTime: 5 * 60_000,
    retry: false,
});

export function useSession() {
    return useSuspenseQuery(sessionQuery).data;
}
