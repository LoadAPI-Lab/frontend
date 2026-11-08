import { describe, expect, it } from 'vitest';

import type { Snapshot } from './schemas';
import { errorSeries, serviceTimeSeries, throughputSeries } from './series';

const snapshot = (
    elapsedSeconds: number,
    route: Partial<Snapshot['targets'][number]> = {},
): Snapshot => ({
    testId: 't1',
    timestamp: '2026-11-06T21:41:09.019Z',
    elapsedSeconds,
    targetRps: 100,
    actualRps: 95 + elapsedSeconds,
    targets: [
        {
            method: 'GET',
            url: 'http://testserver:8080/flaky',
            successCount: 100,
            errorCount: 0,
            lateCount: 0,
            ...route,
        },
    ],
});

describe('throughputSeries', () => {
    it('pairs actual and target RPS per second', () => {
        expect(throughputSeries([snapshot(1), snapshot(2)])).toEqual([
            [1, 2],
            [96, 97],
            [100, 100],
        ]);
    });
});

describe('errorSeries', () => {
    it('counts 4xx, 5xx and network errors per second', () => {
        expect(
            errorSeries([
                snapshot(1, { statusCodes: { '200': 97, '404': 2, '503': 1 } }),
                snapshot(2, { statusCodes: { '200': 99 }, errors: { timeout: 1 } }),
            ]),
        ).toEqual([
            [1, 2],
            [2, 0],
            [1, 0],
            [0, 1],
        ]);
    });
});

describe('serviceTimeSeries', () => {
    it('leaves gaps for seconds without service time', () => {
        expect(
            serviceTimeSeries([
                snapshot(1, { serviceTime: { p50Ms: 30, p95Ms: 90, p99Ms: 140 } }),
                snapshot(2),
            ]),
        ).toEqual([
            [90, null],
            [140, null],
        ]);
    });
});
