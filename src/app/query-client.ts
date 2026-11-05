import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';

import { ApiError, isUnauthorized } from '@/api/fetcher';
import { toast } from '@/components/ui/toast';

import { i18n } from './i18n';

const SESSION_KEY = ['session'] as const;

export interface QueryClientOptions {
    onSessionExpired?: () => void;
}

export function createQueryClient({ onSessionExpired }: QueryClientOptions = {}) {
    const queryCache = new QueryCache({
        onError: (error, query) => {
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
                retry: (failureCount, error) =>
                    !(error instanceof ApiError && error.status < 500) && failureCount < 1,
            },
        },
    });
}

let sessionExpiredHandler: (() => void) | undefined;

export function setSessionExpiredHandler(handler: () => void) {
    sessionExpiredHandler = handler;
}

export const queryClient = createQueryClient({
    onSessionExpired: () => sessionExpiredHandler?.(),
});
