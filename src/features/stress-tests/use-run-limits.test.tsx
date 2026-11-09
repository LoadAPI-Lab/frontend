import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { server } from '@/mocks/server';

import { useRunLimits } from './use-run-limits';

const RUN_ID = '7c2a1f3e-9b4d-4e6a-8f1c-2d3b4a5c6e7f';

function setup(runId: string | undefined) {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    function wrapper({ children }: { children: ReactNode }) {
        return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    }
    return renderHook(() => useRunLimits(runId), { wrapper });
}

describe('useRunLimits', () => {
    it('reads the target and duration the run was started with', async () => {
        server.use(
            http.get('*/v1/test-runs/:id', () =>
                HttpResponse.json({
                    id: RUN_ID,
                    type: 'single',
                    status: 'COMPLETED',
                    createdAt: '2026-11-08T10:00:00.000Z',
                    config: {
                        target: { method: 'GET', url: 'http://testserver:8080/fixed' },
                        targetRps: 250,
                        durationSeconds: 30,
                        rampUpSeconds: 0,
                    },
                }),
            ),
        );
        const hook = setup(RUN_ID);
        await waitFor(() =>
            expect(hook.result.current).toEqual({ targetRps: 250, durationSeconds: 30 }),
        );
    });

    it('has nothing without a run', () => {
        expect(setup(undefined).result.current).toBeNull();
    });
});
