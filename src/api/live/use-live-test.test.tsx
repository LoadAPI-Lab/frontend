import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { FakeEventSource } from '@/test/fake-event-source';

import type { Snapshot } from './schemas';
import { MAX_KEPT_RUNS, useLiveTest } from './use-live-test';

const snapshot = (testId: string, elapsedSeconds: number): Snapshot => ({
    testId,
    timestamp: new Date(Date.UTC(2026, 10, 8, 10, 0, elapsedSeconds)).toISOString(),
    elapsedSeconds,
    targetRps: 100,
    actualRps: 100,
    targets: [
        {
            method: 'GET',
            url: 'http://testserver:8080/fixed',
            successCount: 100,
            errorCount: 0,
            lateCount: 0,
            statusCodes: { '200': 100 },
        },
    ],
});

const flush = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)));

function streamFor(runId: string) {
    const source = FakeEventSource.instances.findLast((candidate) => candidate.url.includes(runId));
    if (!source) {
        throw new Error(`No stream for ${runId}`);
    }
    return source;
}

async function finishRun(runId: string) {
    const hook = renderHook(() => useLiveTest(runId, { durationSeconds: 10 }));
    const source = streamFor(runId);
    act(() => {
        source.emit('status', { status: 'RUNNING' });
        source.emit('snapshot', snapshot(runId, 1));
        source.emit('status', { status: 'COMPLETED' });
    });
    hook.unmount();
    await flush();
}

describe('useLiveTest', () => {
    it('keeps a finished run after the page is left and shows it again', async () => {
        await finishRun('run-a');

        const { result } = renderHook(() => useLiveTest('run-a', { durationSeconds: 10 }));

        expect(result.current.status).toBe('COMPLETED');
        expect(result.current.snapshots).toHaveLength(1);
        expect(FakeEventSource.instances).toHaveLength(1);
    });

    it('keeps streaming a running test while the page is away', async () => {
        const first = renderHook(() => useLiveTest('run-b', { durationSeconds: 10 }));
        const source = streamFor('run-b');
        act(() => source.emit('status', { status: 'RUNNING' }));
        first.unmount();
        await flush();

        expect(source.closed).toBe(false);
        act(() => source.emit('snapshot', snapshot('run-b', 1)));

        const second = renderHook(() => useLiveTest('run-b', { durationSeconds: 10 }));
        expect(second.result.current.snapshots).toHaveLength(1);
        expect(FakeEventSource.instances).toHaveLength(1);
    });

    it(`forgets the oldest finished runs beyond ${MAX_KEPT_RUNS}`, async () => {
        const ids = Array.from({ length: MAX_KEPT_RUNS + 1 }, (_, index) => `run-${index}`);
        await ids.reduce<Promise<void>>(
            (previous, id) => previous.then(() => finishRun(id)),
            Promise.resolve(),
        );

        const oldest = renderHook(() => useLiveTest('run-0', { durationSeconds: 10 }));
        expect(oldest.result.current.snapshots).toHaveLength(0);

        const newest = renderHook(() =>
            useLiveTest(`run-${MAX_KEPT_RUNS}`, { durationSeconds: 10 }),
        );
        expect(newest.result.current.snapshots).toHaveLength(1);
    });
});
