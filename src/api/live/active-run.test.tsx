import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { server } from '@/mocks/server';

import { useActiveRun } from './active-run';

const RUN_ID = '7c2a1f3e-9b4d-4e6a-8f1c-2d3b4a5c6e7f';

function serveRuns(running: boolean) {
    const calls = { count: 0 };
    server.use(
        http.get('*/v1/test-runs', () => {
            calls.count += 1;
            return HttpResponse.json({
                items: running
                    ? [
                          {
                              id: RUN_ID,
                              type: 'single',
                              status: 'RUNNING',
                              createdAt: '2026-11-08T19:00:00.000Z',
                          },
                      ]
                    : [],
            });
        }),
    );
    return calls;
}

function setup() {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    function wrapper({ children }: { children: ReactNode }) {
        return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    }
    return renderHook(() => useActiveRun(), { wrapper });
}

afterEach(() => vi.useRealTimers());

describe('useActiveRun', () => {
    it('asks once and stops when nothing is running', async () => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
        const calls = serveRuns(false);
        const { result } = setup();
        await waitFor(() => expect(calls.count).toBe(1));
        expect(result.current.active).toBeNull();

        await act(() => vi.advanceTimersByTimeAsync(30_000));
        expect(calls.count).toBe(1);
    });

    it('keeps checking every 10 seconds while a test is running', async () => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
        const calls = serveRuns(true);
        const { result } = setup();
        await waitFor(() => expect(result.current.active?.id).toBe(RUN_ID));

        await act(() => vi.advanceTimersByTimeAsync(10_500));
        await waitFor(() => expect(calls.count).toBeGreaterThanOrEqual(2));
    });
});
