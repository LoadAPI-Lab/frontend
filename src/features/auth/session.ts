import { queryOptions, useSuspenseQuery } from '@tanstack/react-query';
import { z } from 'zod';

import { apiFetch } from '@/api/fetcher';

// TODO(api): replace with the generated `getCurrentUser` query once `pnpm api:generate` runs.
export const sessionSchema = z.object({
    id: z.string(),
    name: z.string(),
    email: z.email(),
    /** absent when the user has none */
    avatarUrl: z.string().nullish(),
});

export type Session = z.infer<typeof sessionSchema>;

/** The signed-in user. A 401 (after one refresh attempt in the fetcher) means signed out. */
export const sessionQuery = queryOptions({
    queryKey: ['session'],
    queryFn: async ({ signal }) => sessionSchema.parse(await apiFetch('/v1/users/me', { signal })),
    staleTime: 5 * 60_000,
    retry: false,
});

export function useSession() {
    return useSuspenseQuery(sessionQuery).data;
}
