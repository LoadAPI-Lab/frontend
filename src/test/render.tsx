import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { RenderOptions } from '@testing-library/react';
import { render } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';

/** Fresh QueryClient per test, no retries. Add a memory router here when a test needs <Link>. */
export function renderWithProviders(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    function Wrapper({ children }: { children: ReactNode }) {
        return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    }
    return { queryClient, ...render(ui, { wrapper: Wrapper, ...options }) };
}
