import { MutationCache, QueryClient } from '@tanstack/react-query';

import { ApiError } from '@/api/fetcher';
import { toast } from '@/components/ui/toast';

import { i18n } from './i18n';

export function createQueryClient() {
    return new QueryClient({
        // Every failed mutation (start test, import doc, …) shows core's message as a toast,
        // unless it opts out with `meta: { toastOnError: false }` and handles the error itself.
        mutationCache: new MutationCache({
            onError: (error, _variables, _onMutateResult, mutation) => {
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

export const queryClient = createQueryClient();
