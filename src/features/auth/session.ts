import { queryOptions, useSuspenseQuery } from '@tanstack/react-query';
import type { z } from 'zod';

import { getUsersMeQueryKey, usersMe } from '@/api/generated/endpoints/users/users';
import { UsersMeResponse } from '@/api/generated/zod/users/users.zod';

export const sessionSchema = UsersMeResponse;

export type Session = z.infer<typeof sessionSchema>;

export const sessionQuery = queryOptions({
    queryKey: getUsersMeQueryKey(),
    queryFn: async ({ signal }) => sessionSchema.parse(await usersMe({ signal })),
    staleTime: 5 * 60_000,
    retry: false,
});

export function useSession() {
    return useSuspenseQuery(sessionQuery).data;
}
