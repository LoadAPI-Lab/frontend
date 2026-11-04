import { queryOptions, useSuspenseQuery } from '@tanstack/react-query';
import { z } from 'zod';

import { apiFetch } from '@/api/fetcher';

export const sessionSchema = z.object({
    id: z.string(),
    name: z.string(),
    email: z.email(),
    avatarUrl: z.string().nullish(),
});

export type Session = z.infer<typeof sessionSchema>;

export const sessionQuery = queryOptions({
    queryKey: ['session'],
    queryFn: async ({ signal }) => sessionSchema.parse(await apiFetch('/v1/users/me', { signal })),
    staleTime: 5 * 60_000,
    retry: false,
});

export function useSession() {
    return useSuspenseQuery(sessionQuery).data;
}
