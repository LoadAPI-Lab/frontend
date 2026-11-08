import { useEffect, useMemo, useSyncExternalStore } from 'react';

import { runningTotals } from './aggregate';
import { LiveRunStore, type LiveState } from './live-store';
import { isFinalStatus } from './schemas';
import { type StreamOptions, streamRun } from './snapshot-stream';

const EXTRA_POINTS = 5;
const DEFAULT_POINTS = 600 + EXTRA_POINTS;

interface RunEntry {
    store: LiveRunStore;
    users: number;
    disconnect: (() => void) | null;
}

const runs = new Map<string, RunEntry>();
let streamOptions: StreamOptions = {};

export function setLiveStreamOptions(options: StreamOptions) {
    streamOptions = options;
}

function entryFor(runId: string, maxPoints: number): RunEntry {
    const existing = runs.get(runId);
    if (existing) {
        return existing;
    }
    const entry: RunEntry = { store: new LiveRunStore(maxPoints), users: 0, disconnect: null };
    runs.set(runId, entry);
    return entry;
}

export const MAX_KEPT_RUNS = 5;

const STREAMING: ReadonlySet<LiveState['connection']> = new Set([
    'connecting',
    'open',
    'reconnecting',
]);

function isStreaming(entry: RunEntry) {
    return entry.disconnect !== null && STREAMING.has(entry.store.getState().connection);
}

function drop(runId: string, entry: RunEntry) {
    entry.disconnect?.();
    entry.disconnect = null;
    runs.delete(runId);
}

function pruneIdleRuns() {
    const idleRuns = [...runs].filter(([, entry]) => entry.users === 0 && !isStreaming(entry));
    for (const [runId, entry] of idleRuns.slice(0, Math.max(0, runs.size - MAX_KEPT_RUNS))) {
        drop(runId, entry);
    }
}

function acquire(runId: string, maxPoints: number): () => void {
    const entry = entryFor(runId, maxPoints);
    runs.delete(runId);
    runs.set(runId, entry);
    entry.users += 1;
    if (!isFinalStatus(entry.store.getState().status) && !isStreaming(entry)) {
        entry.disconnect?.();
        entry.disconnect = streamRun(runId, entry.store, streamOptions);
    }
    return () => {
        entry.users -= 1;
        setTimeout(() => {
            if (entry.users === 0 && runs.get(runId) === entry) {
                pruneIdleRuns();
            }
        }, 0);
    };
}

const idle: LiveState = { status: null, reason: null, snapshots: [], connection: 'closed' };
const noop = () => () => null;

export interface LiveTestOptions {
    durationSeconds?: number;
}

export function useLiveTest(runId: string | undefined, { durationSeconds }: LiveTestOptions = {}) {
    const maxPoints = durationSeconds ? durationSeconds + EXTRA_POINTS : DEFAULT_POINTS;
    const store = runId ? entryFor(runId, maxPoints).store : null;

    useEffect(() => (runId ? acquire(runId, maxPoints) : undefined), [runId, maxPoints]);

    const state = useSyncExternalStore(store?.subscribe ?? noop, store?.getState ?? (() => idle));
    const totals = useMemo(() => runningTotals(state.snapshots), [state.snapshots]);

    return {
        ...state,
        latest: state.snapshots.at(-1) ?? null,
        totals,
        isFinal: isFinalStatus(state.status),
    };
}

export type LiveTest = ReturnType<typeof useLiveTest>;

export function resetLiveRuns() {
    for (const entry of runs.values()) {
        entry.disconnect?.();
    }
    runs.clear();
}
