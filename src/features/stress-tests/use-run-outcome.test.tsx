import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { LiveTest, RunStatus } from '@/api/live';
import { toastManager } from '@/components/ui/toast';
import { server } from '@/mocks/server';

import { useRunOutcome } from './use-run-outcome';

const RUN_ID = '7c2a1f3e-9b4d-4e6a-8f1c-2d3b4a5c6e7f';

const result = {
    durationMs: 10_000,
    targetRps: 100,
    avgRps: 99.8,
    targets: [
        {
            method: 'GET',
            url: 'http://testserver:8080/fixed',
            totalRequests: 998,
            successCount: 998,
            errorCount: 0,
            errorRate: 0,
            lateCount: 0,
            responseTime: { p50Ms: 48, p95Ms: 134, p99Ms: 212 },
            statusCodes: { '200': 998 },
        },
    ],
};

type Live = Pick<LiveTest, 'status' | 'reason' | 'isFinal'>;

const live = (status: RunStatus | null, reason: string | null = null): Live => ({
    status,
    reason,
    isFinal: status === 'COMPLETED' || status === 'STOPPED' || status === 'FAILED',
});

function serveRun(body: Record<string, unknown>) {
    server.use(
        http.get('*/v1/test-runs/:id', () =>
            HttpResponse.json({
                id: RUN_ID,
                type: 'single',
                createdAt: '2026-11-08T10:00:00.000Z',
                ...body,
            }),
        ),
    );
}

function setup(initial: Live) {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    function wrapper({ children }: { children: ReactNode }) {
        return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    }
    return renderHook((current: Live) => useRunOutcome(RUN_ID, current), {
        wrapper,
        initialProps: initial,
    });
}

afterEach(() => vi.restoreAllMocks());

describe('useRunOutcome', () => {
    it('announces a completed run and loads its whole-run result', async () => {
        const add = vi.spyOn(toastManager, 'add');
        serveRun({ status: 'COMPLETED', result });
        const hook = setup(live('RUNNING'));
        expect(hook.result.current.summary).toBeNull();

        hook.rerender(live('COMPLETED'));

        expect(add).toHaveBeenCalledWith(
            expect.objectContaining({ type: 'success', title: 'Test completed' }),
        );
        await waitFor(() => expect(hook.result.current.summary?.avgRps).toBe(99.8));
        expect(hook.result.current.summary?.latency).toEqual({ p50Ms: 48, p95Ms: 134, p99Ms: 212 });
        expect(hook.result.current.failure).toBeNull();
    });

    it('announces a stopped run with core’s reason', async () => {
        const add = vi.spyOn(toastManager, 'add');
        serveRun({ status: 'STOPPED', result });
        const hook = setup(live('RUNNING'));

        hook.rerender(live('STOPPED', 'Stopped by user'));

        expect(add).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'info',
                title: 'Test stopped',
                description: 'Stopped by user',
            }),
        );
        await waitFor(() => expect(hook.result.current.summary).not.toBeNull());
    });

    it('announces a failed run and keeps the reason as the failure', async () => {
        const add = vi.spyOn(toastManager, 'add');
        serveRun({ status: 'FAILED', reason: 'The worker lost its connection to the target.' });
        const hook = setup(live('RUNNING'));

        hook.rerender(live('FAILED', 'The worker lost its connection to the target.'));

        expect(add).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'error',
                title: 'Test failed',
                description: 'The worker lost its connection to the target.',
            }),
        );
        expect(hook.result.current.failure).toBe('The worker lost its connection to the target.');
        await waitFor(() => expect(hook.result.current.summary).toBeNull());
    });

    it('falls back to a generic reason when core gives none', () => {
        serveRun({ status: 'FAILED' });
        const hook = setup(live('RUNNING'));
        hook.rerender(live('FAILED'));
        expect(hook.result.current.failure).toBe("The worker didn't give a reason.");
    });

    it('stays quiet when a finished run is opened from a link', async () => {
        const add = vi.spyOn(toastManager, 'add');
        serveRun({ status: 'COMPLETED', result });
        const hook = setup(live('COMPLETED'));

        await waitFor(() => expect(hook.result.current.summary?.avgRps).toBe(99.8));
        expect(add).not.toHaveBeenCalled();
    });

    it('announces each run only once', () => {
        const add = vi.spyOn(toastManager, 'add');
        serveRun({ status: 'COMPLETED', result });
        const hook = setup(live('RUNNING'));
        hook.rerender(live('COMPLETED'));
        hook.rerender(live('COMPLETED', 'again'));
        expect(add).toHaveBeenCalledOnce();
    });

    it('refreshes the running-test check when the run starts and when it ends', async () => {
        let listed = 0;
        serveRun({ status: 'COMPLETED', result });
        server.use(
            http.get('*/v1/test-runs', () => {
                listed += 1;
                return HttpResponse.json({ items: [] });
            }),
        );
        const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        const invalidate = vi.spyOn(client, 'invalidateQueries');
        function wrapper({ children }: { children: ReactNode }) {
            return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
        }
        const hook = renderHook((current: Live) => useRunOutcome(RUN_ID, current), {
            wrapper,
            initialProps: live('PENDING'),
        });
        expect(invalidate).not.toHaveBeenCalled();

        hook.rerender(live('RUNNING'));
        expect(invalidate).toHaveBeenCalledTimes(1);

        hook.rerender(live('COMPLETED'));
        await waitFor(() => expect(invalidate).toHaveBeenCalledTimes(2));
        expect(listed).toBe(0);
    });
});
