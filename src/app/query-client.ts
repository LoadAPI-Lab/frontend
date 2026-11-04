import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';

import { ApiError, isUnauthorized } from '@/api/fetcher';
import { toast } from '@/components/ui/toast';

import { i18n } from './i18n';

/** Key of the signed-in user query (features/auth/session.ts), kept here to avoid a cycle. */
const SESSION_KEY = ['session'] as const;

export interface QueryClientOptions {
    /**
     * Called when a request is still 401 after the fetcher's refresh attempt, i.e. the session
     * is gone. The router wires this to re-run the route guard, which sends the user to login.
     */
    onSessionExpired?: () => void;
}

export function createQueryClient({ onSessionExpired }: QueryClientOptions = {}) {
    const queryCache = new QueryCache({
        onError: (error, query) => {
            // the session query's own 401 is handled by the _app route guard
            if (isUnauthorized(error) && query.queryKey[0] !== SESSION_KEY[0]) {
                expireSession();
            }
        },
    });

    function expireSession() {
        for (const query of queryCache.findAll({ queryKey: SESSION_KEY })) {
            queryCache.remove(query);
        }
        onSessionExpired?.();
    }

    return new QueryClient({
        queryCache,
        // Every failed mutation (start test, import doc, …) shows core's message as a toast,
        // unless it opts out with `meta: { toastOnError: false }` and handles the error itself.
        mutationCache: new MutationCache({
            onError: (error, _variables, _onMutateResult, mutation) => {
                if (isUnauthorized(error)) {
                    expireSession();
                    return;
                }
                if (mutation.meta?.toastOnError === false) {
                    return;
                }
                toast.error({
                    title: i18n.t('errors.actionFailed'),
                    description: error instanceof ApiError ? error.message : undefined,
                });
            },
        }),
        defaultOptions: {
            queries: {
                staleTime: 30_000,
                refetchOnWindowFocus: false,
                // never retry client errors (4xx); retry once on network or server errors
                retry: (failureCount, error) =>
                    !(error instanceof ApiError && error.status < 500) && failureCount < 1,
            },
        },
    });
}

let sessionExpiredHandler: (() => void) | undefined;

/** Set once by the router (it imports this module, so it can't be passed in directly). */
export function setSessionExpiredHandler(handler: () => void) {
    sessionExpiredHandler = handler;
}

export const queryClient = createQueryClient({
    onSessionExpired: () => sessionExpiredHandler?.(),
});
