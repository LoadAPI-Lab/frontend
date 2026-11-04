import { createFileRoute, redirect } from '@tanstack/react-router';
import { z } from 'zod';

import { sessionQuery, takePostLoginRedirect } from '@/features/auth';

// Core redirects here after the provider: with the session cookies set, or with `?error=<code>`.
// Nothing to render; the guard on the target page loads the user.
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
        // a signed-out session may be cached from before the sign-in
        context.queryClient.removeQueries({ queryKey: sessionQuery.queryKey });
        throw redirect({ href: target, replace: true });
    },
});
