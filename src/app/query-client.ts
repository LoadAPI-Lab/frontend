import { QueryClient } from '@tanstack/react-query';

import { ApiError } from '@/api/fetcher';

export function createQueryClient() {
    return new QueryClient({
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
