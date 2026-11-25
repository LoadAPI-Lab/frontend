import { describe, expect, it } from 'vitest';

import { failingCause } from './failing';
import type { RouteSnapshot, Snapshot } from './schemas';

type Counts = Pick<RouteSnapshot, 'successCount' | 'errorCount' | 'statusCodes' | 'errors'>;

const snapshot = (elapsedSeconds: number, counts: Counts): Snapshot => ({
    testId: 't1',
    timestamp: '2026-11-25T12:00:00.000Z',
    elapsedSeconds,
    targetRps: 10,
    actualRps: counts.successCount + counts.errorCount,
    targets: [{ method: 'GET', url: 'https://api.example.com/x', lateCount: 0, ...counts }],
});

const notFound = (count: number): Counts => ({
    successCount: 0,
    errorCount: count,
    statusCodes: { '404': count },
});

const healthy = (count: number): Counts => ({
    successCount: count,
    errorCount: 0,
    statusCodes: { '200': count },
});

const seconds = (from: number, to: number, counts: (second: number) => Counts) =>
    Array.from({ length: to - from + 1 }, (_, index) =>
        snapshot(from + index, counts(from + index)),
    );

describe('failingCause', () => {
    it('names the status code once five seconds have failed', () => {
        expect(failingCause(seconds(1, 5, () => notFound(10)))).toEqual({
            kind: 'status',
            code: '404',
            all: true,
        });
    });

    it('waits for the fifth failing second', () => {
        expect(failingCause(seconds(1, 4, () => notFound(10)))).toBeNull();
    });

    it('waits for at least 20 requests during ramp-up', () => {
        expect(failingCause(seconds(1, 5, () => notFound(3)))).toBeNull();
        expect(failingCause(seconds(1, 5, () => notFound(4)))).not.toBeNull();
    });

    it('counts requests sent before the window towards the minimum', () => {
        const snapshots = [
            ...seconds(1, 2, () => healthy(10)),
            ...seconds(3, 7, () => notFound(2)),
        ];
        expect(failingCause(snapshots)).toMatchObject({ code: '404' });
    });

    it('clears when a second drops under the threshold', () => {
        const snapshots = [...seconds(1, 5, () => notFound(10)), snapshot(6, healthy(10))];
        expect(failingCause(snapshots)).toBeNull();
    });

    it('accepts seconds at exactly 95% errors and says most', () => {
        const mostly: Counts = {
            successCount: 1,
            errorCount: 19,
            statusCodes: { '200': 1, '503': 19 },
        };
        expect(failingCause(seconds(1, 5, () => mostly))).toEqual({
            kind: 'status',
            code: '503',
            all: false,
        });
    });

    it('ignores seconds just under the threshold', () => {
        const almost: Counts = {
            successCount: 2,
            errorCount: 18,
            statusCodes: { '200': 2, '500': 18 },
        };
        expect(failingCause(seconds(1, 5, () => almost))).toBeNull();
    });

    it('needs the five seconds to be consecutive', () => {
        const snapshots = [
            ...seconds(1, 2, () => notFound(10)),
            ...seconds(4, 6, () => notFound(10)),
        ];
        expect(failingCause(snapshots)).toBeNull();
    });

    it('treats a second without requests as not failing', () => {
        const snapshots = [
            ...seconds(1, 4, () => notFound(10)),
            snapshot(5, { successCount: 0, errorCount: 0 }),
        ];
        expect(failingCause(snapshots)).toBeNull();
    });

    it('names the network error when there are no responses', () => {
        const refused: Counts = {
            successCount: 0,
            errorCount: 10,
            errors: { connection_refused: 10 },
        };
        expect(failingCause(seconds(1, 5, () => refused))).toEqual({
            kind: 'network',
            error: 'connection_refused',
            all: true,
        });
    });

    it('picks the most common cause across the window', () => {
        const mixed: Counts = {
            successCount: 0,
            errorCount: 10,
            statusCodes: { '401': 3 },
            errors: { timeout: 7 },
        };
        expect(failingCause(seconds(1, 5, () => mixed))).toEqual({
            kind: 'network',
            error: 'timeout',
            all: false,
        });
    });
});
