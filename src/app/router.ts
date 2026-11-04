import { createRouter } from '@tanstack/react-router';

import { routeTree } from '@/routeTree.gen';

import { queryClient, setSessionExpiredHandler } from './query-client';

export const router = createRouter({
    routeTree,
    context: { queryClient },
    defaultPreload: 'intent',
    // let TanStack Query decide freshness
    defaultPreloadStaleTime: 0,
    scrollRestoration: true,
});

// Session gone mid-use: re-run the guards. _app's guard refetches the user, gets the 401 and
// redirects to /login?redirect=<current page>.
setSessionExpiredHandler(() => {
    void router.invalidate();
});

declare module '@tanstack/react-router' {
    interface Register {
        router: typeof router;
    }
}
