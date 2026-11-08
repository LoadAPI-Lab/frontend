import type { Snapshot } from '@/api/live';

export function sampleSnapshot(second: number, overrides: Partial<Snapshot> = {}): Snapshot {
    const wave = Math.sin(second / 3);
    const p50 = Math.round(40 + wave * 3 + second * 0.05);
    return {
        testId: 'sample-run',
        timestamp: new Date(Date.UTC(2026, 10, 6, 12, 0, second)).toISOString(),
        elapsedSeconds: second,
        targetRps: 300,
        actualRps: 297.4,
        targets: [
            {
                method: 'POST',
                url: 'https://staging.tasks.dev/api/tasks',
                successCount: 294,
                errorCount: 1,
                lateCount: 0,
                responseTime: {
                    p50Ms: p50,
                    p95Ms: Math.round(p50 * 2.8),
                    p99Ms: Math.round(p50 * 4.3),
                },
                serviceTime: {
                    p50Ms: Math.round(p50 * 0.85),
                    p95Ms: Math.round(p50 * 2.2),
                    p99Ms: Math.round(p50 * 3.2),
                },
                statusCodes: { '200': 288, '404': 6, '503': 1 },
            },
        ],
        ...overrides,
    };
}

export function troubledSnapshot(second: number): Snapshot {
    const base = sampleSnapshot(second);
    const [route] = base.targets;
    if (!route || second % 4 !== 0) {
        return base;
    }
    return {
        ...base,
        targets: [
            {
                ...route,
                errorCount: route.errorCount + 3,
                lateCount: 12,
                errors: { timeout: 2, connection_reset: 1 },
            },
        ],
    };
}

export const sampleSnapshots = (count: number, troubled = false) =>
    Array.from({ length: count }, (_, index) =>
        troubled ? troubledSnapshot(index + 1) : sampleSnapshot(index + 1),
    );
