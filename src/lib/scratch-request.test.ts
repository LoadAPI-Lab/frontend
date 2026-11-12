import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { emptyDraft, newRow } from './request-draft';
import {
    clearScratch,
    emptyScratch,
    hasScratchContent,
    queryRowsOf,
    readScratch,
    saveScratch,
    type ScratchRequest,
    urlWithoutQuery,
    urlWithQueryRows,
    useScratchRequest,
} from './scratch-request';

afterEach(() => sessionStorage.clear());

const scratch = (changes: Partial<ScratchRequest>): ScratchRequest => ({
    ...emptyScratch(),
    ...changes,
});

describe('scratch request URL', () => {
    it('reads query rows from the URL and keeps the ids of rows in the same place', () => {
        const first = newRow('page', '1');
        const rows = queryRowsOf('https://api.dev/tasks?page=2&q=a%20b#top', [first]);
        expect(rows.map(({ key, value }) => [key, value])).toEqual([
            ['page', '2'],
            ['q', 'a b'],
        ]);
        expect(rows[0]?.id).toBe(first.id);
        expect(queryRowsOf('https://api.dev/tasks', [first])).toEqual([]);
    });

    it('writes query rows back into the URL and skips rows without a name', () => {
        const rows = [newRow('q', 'a b'), newRow('', 'x'), newRow(' page ', '2')];
        expect(urlWithQueryRows('https://api.dev/tasks?old=1#top', rows)).toBe(
            'https://api.dev/tasks?q=a+b&page=2#top',
        );
        expect(urlWithQueryRows('https://api.dev/tasks?old=1', [])).toBe('https://api.dev/tasks');
    });

    it('drops the query for the request route', () => {
        expect(urlWithoutQuery('https://api.dev/tasks?page=2#top')).toBe(
            'https://api.dev/tasks#top',
        );
        expect(urlWithoutQuery('https://api.dev/tasks')).toBe('https://api.dev/tasks');
    });
});

describe('scratch request storage', () => {
    it('has content once anything is filled in', () => {
        expect(hasScratchContent(emptyScratch())).toBe(false);
        expect(hasScratchContent(scratch({ method: 'POST' }))).toBe(false);
        expect(hasScratchContent(scratch({ url: 'https://api.dev' }))).toBe(true);
        expect(hasScratchContent(scratch({ draft: { ...emptyDraft(), body: '{}' } }))).toBe(true);
        expect(
            hasScratchContent(
                scratch({ draft: { ...emptyDraft(), auth: { kind: 'bearer', token: '' } } }),
            ),
        ).toBe(true);
    });

    it('keeps a request with content and forgets an empty one', () => {
        const saved = scratch({ method: 'POST', url: 'https://api.dev/tasks' });
        saveScratch(saved);
        expect(readScratch()).toEqual(saved);
        expect(readScratch()).toBe(readScratch());
        saveScratch(scratch({ method: 'PUT' }));
        expect(readScratch()).toBeNull();
    });

    it('notifies subscribers when it is saved or cleared', () => {
        const { result } = renderHook(() => useScratchRequest());
        expect(result.current).toBeNull();
        act(() => saveScratch(scratch({ url: 'https://api.dev' })));
        expect(result.current?.url).toBe('https://api.dev');
        act(() => clearScratch());
        expect(result.current).toBeNull();
    });

    it('ignores stored values of the wrong shape', () => {
        sessionStorage.setItem('routelab.tests.scratch', '{"method": "FETCH", "url": ""}');
        expect(readScratch()).toBeNull();
        sessionStorage.setItem('routelab.tests.scratch', 'not json');
        expect(readScratch()).toBeNull();
    });
});
