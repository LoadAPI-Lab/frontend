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
        expect(totals.codes).toEqual({ '200': 198, '500': 2 });
    });

    it('sums late requests and network errors by kind', () => {
        const totals = runningTotals([
            snapshot({ successCount: 9, errorCount: 1, lateCount: 3, errors: { timeout: 1 } }),
            snapshot({
                successCount: 8,
                errorCount: 2,
                lateCount: 1,
                errors: { timeout: 1, connection_refused: 1 },
            }),
        ]);
        expect(totals.late).toBe(4);
        expect(totals.networkErrors).toEqual({
            timeout: 2,
            connection_refused: 1,
            connection_reset: 0,
            dns: 0,
            blocked: 0,
            other: 0,
        });
        expect(totals.statuses.network).toBe(3);
    });

    it('returns a zero error rate when nothing ran', () => {
        expect(runningTotals([]).errorRate).toBe(0);
    });
});
