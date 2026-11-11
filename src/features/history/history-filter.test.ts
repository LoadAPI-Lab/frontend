import { describe, expect, it } from 'vitest';

import type { ListTestRunsResponseDtoItemsItemRequestMethod } from '@/api/generated/model';

import type { RunListItem } from './history-api';
import { endpointKey, filterRuns, groupByEndpoint, matchesSearch } from './history-filter';

const single = (
    id: string,
    method: ListTestRunsResponseDtoItemsItemRequestMethod,
    url: string,
    status: RunListItem['status'],
) =>
    ({
        id,
        type: 'single',
        status,
        createdAt: '2026-11-11T10:00:00.000Z',
        request: { method, url },
    }) satisfies RunListItem;

const scenario = (id: string) =>
    ({
        id,
        type: 'scenario',
        status: 'COMPLETED',
        createdAt: '2026-11-11T09:00:00.000Z',
        stepsCount: 3,
    }) satisfies RunListItem;

const runs = [
    single('a', 'GET', 'http://localhost:8080/status/429', 'COMPLETED'),
    single('b', 'GET', 'http://localhost:8080/fixed?delay=200', 'FAILED'),
    single('c', 'POST', 'http://staging.example.com/fixed?delay=50', 'STOPPED'),
    single('d', 'GET', 'http://localhost:8080/fixed?delay=10', 'COMPLETED'),
    scenario('e'),
];

describe('matchesSearch', () => {
    it('matches everything when the query is blank', () => {
        expect(filterRuns(runs, '   ')).toHaveLength(runs.length);
        expect(filterRuns(runs)).toHaveLength(runs.length);
    });

    it('matches the method, path and query, ignoring case', () => {
        expect(filterRuns(runs, '/FIXED').map((run) => run.id)).toEqual(['b', 'c', 'd']);
        expect(filterRuns(runs, 'post /fixed').map((run) => run.id)).toEqual(['c']);
        expect(filterRuns(runs, 'delay=200').map((run) => run.id)).toEqual(['b']);
    });

    it('ignores the host, which the list does not show', () => {
        expect(filterRuns(runs, 'staging')).toEqual([]);
        expect(filterRuns(runs, 'localhost')).toEqual([]);
        expect(filterRuns(runs, 'http')).toEqual([]);
    });

    it('matches encoded paths by their readable form', () => {
        const run = single('x', 'GET', 'http://localhost/users/%7Bid%7D', 'COMPLETED');
        expect(matchesSearch(run, '/users/{id}')).toBe(true);
    });

    it('never matches a run without a request', () => {
        expect(matchesSearch(scenario('s'), 'scenario')).toBe(false);
    });
});

describe('groupByEndpoint', () => {
    it('groups by method and path, ignoring host and query', () => {
        expect(endpointKey(runs[1] ?? scenario('z'))).toBe('GET /fixed');
        const groups = groupByEndpoint(runs);
        expect(groups.map((group) => group.key)).toEqual([
            'GET /status/429',
            'GET /fixed',
            'POST /fixed',
            'type:scenario',
        ]);
        const fixed = groups[1];
        expect(fixed?.runs.map((run) => run.id)).toEqual(['b', 'd']);
        expect(fixed?.latest.status).toBe('FAILED');
        expect(fixed?.path).toBe('/fixed');
        expect(fixed?.method).toBe('GET');
    });

    it('puts scenario runs in one group per type', () => {
        const groups = groupByEndpoint([scenario('s1'), scenario('s2')]);
        expect(groups).toHaveLength(1);
        expect(groups[0]?.path).toBeUndefined();
        expect(groups[0]?.runs).toHaveLength(2);
    });

    it('returns no groups for no runs', () => {
        expect(groupByEndpoint([])).toEqual([]);
    });
});
