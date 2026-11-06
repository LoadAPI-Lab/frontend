import { describe, expect, it } from 'vitest';

import { latencySeries, snapshotLatency } from './latency';
import type { Snapshot } from './schemas';

const snapshot = (
    elapsedSeconds: number,
    responseTime?: Snapshot['targets'][number]['responseTime'],
): Snapshot => ({
    testId: 't1',
    timestamp: '2026-10-29T12:00:00.000Z',
    elapsedSeconds,
    targetRps: 300,
    actualRps: 298,
    targets: [
        {
            method: 'GET',
            url: 'https://api.dev/tasks',
            successCount: 10,
            errorCount: 0,
            lateCount: 0,
            responseTime,
        },
    ],
});

describe('snapshotLatency', () => {
    it('reads the first route with response times', () => {
        expect(snapshotLatency(snapshot(1, { p50Ms: 41, p95Ms: 118, p99Ms: 180 }))).toEqual({
            p50Ms: 41,
            p95Ms: 118,
            p99Ms: 180,
        });
        expect(snapshotLatency(snapshot(1))).toBeNull();
    });
});

describe('latencySeries', () => {
    it('builds aligned columns and leaves gaps for seconds without latency', () => {
        expect(
            latencySeries([
                snapshot(1, { p50Ms: 40, p95Ms: 110, p99Ms: 170 }),
                snapshot(2),
                snapshot(3, { p50Ms: 42, p95Ms: 120, p99Ms: 182 }),
            ]),
        ).toEqual([
            [1, 2, 3],
            [40, null, 42],
            [110, null, 120],
            [170, null, 182],
        ]);
    });

    it('is empty without snapshots', () => {
        expect(latencySeries([])).toEqual([[], [], [], []]);
    });
});
