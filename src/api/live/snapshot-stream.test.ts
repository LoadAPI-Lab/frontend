import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FakeEventSource } from '@/test/fake-event-source';

import { runningTotals } from './aggregate';
import { LiveRunStore } from './live-store';
import type { Snapshot } from './schemas';
import { streamRun } from './snapshot-stream';

const RUN = '7c2a1f3e-9b4d-4e6a-8f1c-2d3b4a5c6e7f';

const snapshot = (elapsedSeconds: number, actualRps: number): Snapshot => ({
    testId: RUN,
    timestamp: new Date(Date.UTC(2026, 10, 9, 10, 0, elapsedSeconds)).toISOString(),
    elapsedSeconds,
    targetRps: 100,
    actualRps,
    targets: [
        {
            method: 'GET',
            url: 'http://testserver:8080/fixed',
            successCount: actualRps - 1,
            errorCount: 1,
            lateCount: 0,
            responseTime: { p50Ms: 40, p95Ms: 110, p99Ms: 180 },
            statusCodes: { '200': actualRps - 1, '503': 1 },
        },
    ],
});

function setup(maxPoints = 100) {
    const store = new LiveRunStore(maxPoints);
    const refresh = vi.fn<() => Promise<boolean>>().mockResolvedValue(true);
    const disconnect = streamRun(RUN, store, {
        createEventSource: (url) => new FakeEventSource(url),
        refresh,
        backoffMs: [1000, 2000, 4000],
        maxAttempts: 3,
    });
    return { store, refresh, disconnect };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('streamRun', () => {
    it('reads the run status and per-second snapshots during ramp-up', () => {
        const { store } = setup();
        const source = FakeEventSource.latest();
        expect(source.url).toBe(`/v1/test-runs/${RUN}/metrics`);

        source.open();
        source.emit('status', { status: 'RUNNING' });
        for (const [second, rps] of [
            [1, 20],
            [2, 50],
            [3, 100],
        ] as const) {
            source.emit('snapshot', snapshot(second, rps));
        }

        const state = store.getState();
        expect(state).toMatchObject({ status: 'RUNNING', connection: 'open' });
        expect(state.snapshots.map((item) => item.actualRps)).toEqual([20, 50, 100]);
        expect(runningTotals(state.snapshots)).toMatchObject({ requests: 170, errors: 3 });
    });

    it('reconnects with backoff after a dropped connection', () => {
        const { store } = setup();
        const first = FakeEventSource.latest();
        first.emit('status', { status: 'RUNNING' });
        first.emit('snapshot', snapshot(1, 50));

        first.fail();
        expect(first.closed).toBe(true);
        expect(store.getState().connection).toBe('reconnecting');
        expect(FakeEventSource.instances).toHaveLength(1);

        vi.advanceTimersByTime(1000);
        expect(FakeEventSource.instances).toHaveLength(2);
        const second = FakeEventSource.latest();
        second.emit('status', { status: 'RUNNING' });
        second.emit('snapshot', snapshot(2, 80));
        expect(store.getState().snapshots.map((item) => item.elapsedSeconds)).toEqual([1, 2]);
        expect(store.getState().connection).toBe('open');
    });

    it('starts empty after a reload mid-run and keeps what arrives', () => {
        const { store } = setup();
        const source = FakeEventSource.latest();
        source.emit('status', { status: 'RUNNING' });
        source.emit('snapshot', snapshot(42, 98));
        expect(store.getState().snapshots).toHaveLength(1);
        expect(store.getState().snapshots[0]?.elapsedSeconds).toBe(42);
    });

    it('refreshes the session once when the stream fails before any event', async () => {
        const { store, refresh } = setup();
        FakeEventSource.latest().fail();
        await vi.waitFor(() => expect(FakeEventSource.instances).toHaveLength(2));
        expect(refresh).toHaveBeenCalledOnce();
        FakeEventSource.latest().emit('status', { status: 'RUNNING' });
        expect(store.getState().connection).toBe('open');
    });

    it('gives up as expired when the refresh fails', async () => {
        const { store, refresh } = setup();
        refresh.mockResolvedValue(false);
        FakeEventSource.latest().fail();
        await vi.waitFor(() => expect(store.getState().connection).toBe('expired'));
        expect(FakeEventSource.instances).toHaveLength(1);
    });

    it('stops reconnecting after too many failed attempts', async () => {
        const { store } = setup();
        FakeEventSource.latest().fail();
        await vi.waitFor(() => expect(FakeEventSource.instances).toHaveLength(2));
        for (const delay of [1000, 2000, 4000]) {
            FakeEventSource.latest().fail();
            vi.advanceTimersByTime(delay);
        }
        FakeEventSource.latest().fail();
        expect(store.getState().connection).toBe('lost');
    });

    it('closes after the final status and does not reconnect', () => {
        const { store } = setup();
        const source = FakeEventSource.latest();
        source.emit('status', { status: 'RUNNING' });
        source.emit('status', { status: 'STOPPED', reason: 'Stopped by user' });
        expect(source.closed).toBe(true);
        expect(store.getState()).toMatchObject({
            status: 'STOPPED',
            reason: 'Stopped by user',
            connection: 'closed',
        });
        source.fail();
        vi.advanceTimersByTime(30_000);
        expect(FakeEventSource.instances).toHaveLength(1);
    });

    it('keeps memory bounded to the newest points', () => {
        const { store } = setup(5);
        const source = FakeEventSource.latest();
        for (let second = 1; second <= 12; second += 1) {
            source.emit('snapshot', snapshot(second, 100));
        }
        expect(store.getState().snapshots.map((item) => item.elapsedSeconds)).toEqual([
            8, 9, 10, 11, 12,
        ]);
    });

    it('ignores events that fail validation', () => {
        const { store } = setup();
        const source = FakeEventSource.latest();
        source.emit('status', { status: 'EXPLODED' });
        source.emit('snapshot', { elapsedSeconds: 'soon' });
        expect(store.getState()).toMatchObject({ status: null, snapshots: [] });
    });
});
