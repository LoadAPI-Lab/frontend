import { afterEach, describe, expect, it } from 'vitest';

import { lastTestsSearch, rememberTestsSearch } from './last-tests-search';

afterEach(() => sessionStorage.clear());

describe('last Tests page search', () => {
    it('returns what was remembered in this tab', () => {
        rememberTestsSearch({ spec: 's1', endpoint: 'GET /fixed', run: 'r1' });
        expect(lastTestsSearch()).toEqual({ spec: 's1', endpoint: 'GET /fixed', run: 'r1' });
    });

    it('remembers the scratch request', () => {
        rememberTestsSearch({ scratch: 1, run: 'r2' });
        expect(lastTestsSearch()).toEqual({ scratch: 1, run: 'r2' });
    });

    it('is empty before anything was remembered', () => {
        expect(lastTestsSearch()).toEqual({});
    });

    it('ignores stored values of the wrong shape', () => {
        sessionStorage.setItem('routelab.tests.last', '{"spec": 42}');
        expect(lastTestsSearch()).toEqual({});
        sessionStorage.setItem('routelab.tests.last', 'not json');
        expect(lastTestsSearch()).toEqual({});
    });
});
