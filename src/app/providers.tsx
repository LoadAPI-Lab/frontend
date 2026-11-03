import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';

import { Toaster } from '@/components/ui/toast';

import { queryClient } from './query-client';
import { router } from './router';

export function Providers() {
    return (
        <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
            <Toaster />
        </QueryClientProvider>
    );
}
