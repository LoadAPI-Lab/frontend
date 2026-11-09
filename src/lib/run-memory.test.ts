import { afterEach, describe, expect, it } from 'vitest';

import { lastRunFor, placeOfRun, rememberRun } from './run-memory';

const fixed = { spec: 's1', endpoint: 'GET /fixed' };
const flaky = { spec: 's1', endpoint: 'GET /flaky' };

afterEach(() => sessionStorage.clear());

describe('run memory', () => {
    it('remembers the last run per endpoint and where each run belongs', () => {
        rememberRun('r1', fixed);
        rememberRun('r2', flaky);
        rememberRun('r3', fixed);

        expect(lastRunFor(fixed)).toBe('r3');
        expect(lastRunFor(flaky)).toBe('r2');
        expect(placeOfRun('r1')).toEqual(fixed);
        expect(lastRunFor({ spec: 's2', endpoint: 'GET /fixed' })).toBeUndefined();
    });

    it('keeps only the latest 20 run places', () => {
        for (let index = 0; index < 25; index += 1) {
            rememberRun(`r${index}`, fixed);
        }
        expect(placeOfRun('r0')).toBeUndefined();
        expect(placeOfRun('r24')).toEqual(fixed);
    });

    it('survives bad stored values', () => {
        sessionStorage.setItem('routelab.tests.runs', 'not json');
        expect(lastRunFor(fixed)).toBeUndefined();
    });
});
