import { describe, expect, it } from 'vitest';

import {
    buildRequest,
    emptyDraft,
    headerCount,
    newRow,
    pathParamNames,
    type RequestDraft,
} from './request-draft';

const route = { method: 'GET' as const, url: 'https://api.dev/tasks/{id}/comments/:commentId' };

const draft = (changes: Partial<RequestDraft>): RequestDraft => ({ ...emptyDraft(), ...changes });

describe('pathParamNames', () => {
    it('lists {name} and :name segments once each', () => {
        expect(pathParamNames(route.url)).toEqual(['id', 'commentId']);
        expect(pathParamNames('https://api.dev/a/{id}/b/{id}?x={y}')).toEqual(['id']);
    });
});

describe('buildRequest', () => {
    it('fills path parameters and leaves empty ones for the Start check', () => {
        expect(buildRequest(route, draft({ pathParams: { id: '42 a', commentId: '' } }))).toEqual({
            method: 'GET',
            url: 'https://api.dev/tasks/42%20a/comments/:commentId',
        });
    });

    it('appends query parameters, skipping rows without a name', () => {
        const built = buildRequest(
            { method: 'GET', url: 'https://api.dev/tasks?page=1#top' },
            draft({ query: [newRow('status', 'open'), newRow('', 'ignored')] }),
        );
        expect(built.url).toBe('https://api.dev/tasks?page=1&status=open#top');
    });

    it('sends headers and counts only named rows', () => {
        const value = draft({ headers: [newRow('X-Trace', 'on'), newRow(' ', 'x')] });
        expect(buildRequest({ method: 'GET', url: 'https://api.dev' }, value).headers).toEqual({
            'X-Trace': 'on',
        });
        expect(headerCount(value)).toBe(1);
    });

    it('adds bearer and basic auth, replacing a typed Authorization header', () => {
        const base = { method: 'GET' as const, url: 'https://api.dev' };
        expect(
            buildRequest(
                base,
                draft({
                    headers: [newRow('authorization', 'old')],
                    auth: { kind: 'bearer', token: ' abc ' },
                }),
            ).headers,
        ).toEqual({ Authorization: 'Bearer abc' });
        expect(
            buildRequest(
                base,
                draft({ auth: { kind: 'basic', username: 'ada', password: 'pässword' } }),
            ).headers,
        ).toEqual({ Authorization: 'Basic YWRhOnDDpHNzd29yZA==' });
    });

    it('adds an API key to the headers or the query', () => {
        const base = { method: 'GET' as const, url: 'https://api.dev/tasks' };
        expect(
            buildRequest(
                base,
                draft({ auth: { kind: 'apiKey', name: 'X-Key', value: 's3', location: 'header' } }),
            ),
        ).toEqual({ ...base, headers: { 'X-Key': 's3' } });
        expect(
            buildRequest(
                base,
                draft({ auth: { kind: 'apiKey', name: 'key', value: 's3', location: 'query' } }),
            ),
        ).toEqual({ ...base, url: 'https://api.dev/tasks?key=s3' });
    });
});
