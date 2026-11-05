import { createRouter } from '@tanstack/react-router';

import { routeTree } from '@/routeTree.gen';

import { queryClient, setSessionExpiredHandler } from './query-client';

export const router = createRouter({
    routeTree,
    context: { queryClient },
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
    scrollRestoration: true,
});

setSessionExpiredHandler(() => {
    void router.invalidate();
});

declare module '@tanstack/react-router' {
    interface Register {
        router: typeof router;
    }
}
