import { describe, expect, it } from 'vitest';

import { routeRuns, type RunListItem } from './history-api';

const run = (id: string, url: string, type: RunListItem['type'] = 'single'): RunListItem => ({
    id,
    type,
    status: 'COMPLETED',
    createdAt: '2026-11-09T10:00:00.000Z',
    ...(type === 'single' ? { request: { method: 'GET', url } } : {}),
});

describe('routeRuns', () => {
    const items = [
        run('r5', 'http://t/a'),
        run('r4', 'http://t/b'),
        run('r3', 'http://t/a'),
        run('s1', '', 'scenario'),
        run('r2', 'http://t/a'),
        run('r1', 'http://t/a'),
    ];

    it('lists the run and its older runs of the same route', () => {
        expect(routeRuns(items, 'r3', 5).map((item) => item.id)).toEqual(['r3', 'r2', 'r1']);
        expect(routeRuns(items, 'r5', 2).map((item) => item.id)).toEqual(['r5', 'r3']);
    });

    it('is empty for unknown runs and scenario runs', () => {
        expect(routeRuns(items, 'nope', 5)).toEqual([]);
        expect(routeRuns(items, 's1', 5)).toEqual([]);
    });
});
