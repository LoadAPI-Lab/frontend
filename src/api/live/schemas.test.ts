import { describe, expect, it } from 'vitest';

import { snapshotSchema } from './schemas';

const snapshot = (errors: Record<string, number>) => ({
    testId: '811a9015-7dd4-4dde-9788-5b44aad85196',
    timestamp: '2026-11-12T09:18:42.174Z',
    elapsedSeconds: 1,
    targetRps: 100,
    actualRps: 100,
    targets: [
        {
            method: 'GET',
            url: 'http://testserver:8080/v1/test-runs/1',
            successCount: 0,
            errorCount: 100,
            lateCount: 0,
            errors,
        },
    ],
});

describe('snapshotSchema', () => {
    it('reads requests the worker blocked', () => {
        const parsed = snapshotSchema.parse(snapshot({ blocked: 100 }));
        expect(parsed.targets[0]?.errors).toEqual({ blocked: 100 });
    });

    it('counts error kinds it does not know as other instead of dropping the snapshot', () => {
        const parsed = snapshotSchema.parse(snapshot({ tls: 2, other: 1, timeout: 3 }));
        expect(parsed.targets[0]?.errors).toEqual({ other: 3, timeout: 3 });
    });
});
