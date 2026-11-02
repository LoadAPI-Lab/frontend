import { describe, expect, it } from 'vitest';

import { groupStatusCodes, runningTotals } from './aggregate';
import type { Snapshot } from './schemas';

const snapshot = (overrides: Partial<Snapshot['targets'][number]>): Snapshot => ({
    testId: 't1',
    timestamp: '2026-10-29T12:00:00.000Z',
    elapsedSeconds: 1,
    targetRps: 300,
    actualRps: 298,
    targets: [
        {
            method: 'POST',
            url: 'https://staging.tasks.dev/api/tasks',
            successCount: 0,
            errorCount: 0,
            lateCount: 0,
            ...overrides,
        },
    ],
});

describe('groupStatusCodes', () => {
    it('groups codes by class and folds network errors', () => {
        expect(
            groupStatusCodes({
                statusCodes: { '200': 90, '201': 5, '404': 3, '503': 1 },
                errors: { timeout: 1 },
            }),
        ).toEqual({ '2xx': 95, '3xx': 0, '4xx': 3, '5xx': 1, network: 1 });
    });

    it('handles missing maps', () => {
        expect(groupStatusCodes({})).toEqual({
            '2xx': 0,
            '3xx': 0,
            '4xx': 0,
            '5xx': 0,
            network: 0,
        });
    });
});

describe('runningTotals', () => {
    it('sums requests and errors across seconds', () => {
        const totals = runningTotals([
            snapshot({ successCount: 98, errorCount: 2, statusCodes: { '200': 98, '500': 2 } }),
            snapshot({ successCount: 100, errorCount: 0, statusCodes: { '200': 100 } }),
        ]);
        expect(totals.requests).toBe(200);
        expect(totals.errors).toBe(2);
        expect(totals.errorRate).toBeCloseTo(0.01);
        expect(totals.statuses['2xx']).toBe(198);
    });

    it('returns a zero error rate when nothing ran', () => {
        expect(runningTotals([]).errorRate).toBe(0);
    });
});
