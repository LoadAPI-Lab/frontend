import { describe, expect, it } from 'vitest';

import { summarizeRunResult } from './result';

const result = {
    durationMs: 10_012,
    targetRps: 100,
    avgRps: 99.8,
    targets: [
        {
            method: 'GET',
            url: 'http://testserver:8080/flaky',
            totalRequests: 998,
            successCount: 995,
            errorCount: 3,
            errorRate: 0.003,
            lateCount: 4,
            responseTime: { p50Ms: 48, p95Ms: 134, p99Ms: 212 },
            serviceTime: { p50Ms: 40, p95Ms: 110, p99Ms: 170 },
            statusCodes: { '200': 975, '404': 20, '503': 3 },
        },
    ],
};

describe('summarizeRunResult', () => {
    it('reads the overall numbers for the whole run', () => {
        const summary = summarizeRunResult(result);
        expect(summary).toMatchObject({
            avgRps: 99.8,
            targetRps: 100,
            durationSeconds: 10,
            latency: { p50Ms: 48, p95Ms: 134, p99Ms: 212 },
        });
        expect(summary?.totals).toMatchObject({
            requests: 998,
            errors: 3,
            late: 4,
            codes: { '200': 975, '404': 20, '503': 3 },
        });
        expect(summary?.totals.errorRate).toBeCloseTo(0.003);
    });

    it('returns null for a missing or unexpected result', () => {
        expect(summarizeRunResult(null)).toBeNull();
        expect(summarizeRunResult({ summary: {}, steps: [] })).toBeNull();
    });
});
