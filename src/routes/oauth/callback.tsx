import { createFileRoute, redirect } from '@tanstack/react-router';
import { z } from 'zod';

import { sessionQuery, takePostLoginRedirect } from '@/features/auth';

export const Route = createFileRoute('/oauth/callback')({
    validateSearch: z.object({ error: z.string().optional() }),
    beforeLoad: ({ context, search }) => {
        const target = takePostLoginRedirect();
        if (search.error) {
            throw redirect({
                to: '/login',
                search: { error: search.error, redirect: target },
                replace: true,
            });
        }
        context.queryClient.removeQueries({ queryKey: sessionQuery.queryKey });
        throw redirect({ href: target, replace: true });
    },
});
