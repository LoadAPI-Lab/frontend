import { describe, expect, it } from 'vitest';

import type { TestRunResponseDto } from '@/api/generated/model';
import { buildRequest } from '@/lib/request-draft';

import { maskedSecret, pastRequest, pastScratch, splitTargetUrl } from './past-run';

describe('splitTargetUrl', () => {
    it('splits the origin from the path and drops the query', () => {
        expect(splitTargetUrl('http://localhost:8080/status/{code}?delay=***')).toEqual({
            server: 'http://localhost:8080',
            path: '/status/{code}',
        });
        expect(splitTargetUrl('https://api.shop.example.com/v2/products#x')).toEqual({
            server: 'https://api.shop.example.com',
            path: '/v2/products',
        });
    });

    it('keeps placeholders as typed and shows / for a bare origin', () => {
        expect(splitTargetUrl('http://testserver:8080/tasks/{{taskId}}')).toEqual({
            server: 'http://testserver:8080',
            path: '/tasks/{{taskId}}',
        });
        expect(splitTargetUrl('http://testserver:8080')).toEqual({
            server: 'http://testserver:8080',
            path: '/',
        });
    });

    it('treats a URL without an origin as a path', () => {
        expect(splitTargetUrl('/health?x=1')).toEqual({ server: '', path: '/health' });
    });
});

const run = (config: TestRunResponseDto['config']): TestRunResponseDto => ({
    id: '7c2a1f3e-9b4d-4e6a-8f1c-2d3b4a5c6e7f',
    type: 'single',
    status: 'STOPPED',
    createdAt: '2026-11-08T10:00:00.000Z',
    config,
});

describe('pastRequest', () => {
    it('rebuilds the request and settings a run was started with', () => {
        const past = pastRequest(
            run({
                target: {
                    method: 'POST',
                    url: 'http://testserver:8080/tasks?trace=1&tag=a%20b',
                    headers: { 'X-Team': 'qa', Authorization: 'Bearer ***' },
                    body: '{"title":"task-{{$uuid}}"}',
                },
                targetRps: 250,
                durationSeconds: 30,
                rampUpSeconds: 5,
            }),
        );
        expect(past).toMatchObject({
            method: 'POST',
            server: 'http://testserver:8080',
            path: '/tasks',
            config: { targetRps: 250, durationSeconds: 30, rampUpSeconds: 5 },
            draft: {
                body: '{"title":"task-{{$uuid}}"}',
                auth: { kind: 'bearer', token: '***' },
                headers: [{ key: 'X-Team', value: 'qa' }],
                query: [
                    { key: 'trace', value: '1' },
                    { key: 'tag', value: 'a b' },
                ],
            },
        });
        const route = { method: 'POST' as const, url: 'http://localhost:9090/tasks' };
        expect(past && buildRequest(route, past.draft)).toEqual({
            method: 'POST',
            url: 'http://localhost:9090/tasks?trace=1&tag=a+b',
            headers: { 'X-Team': 'qa', Authorization: 'Bearer ***' },
        });
    });

    it('skips scenario runs', () => {
        expect(pastRequest(run({ steps: [] }))).toBeNull();
    });
});

describe('pastScratch', () => {
    it('turns a past run into a scratch request with the query in the URL', () => {
        const past = pastRequest(
            run({
                target: { method: 'DELETE', url: 'https://api.dev/v1/tasks/7?force=1' },
                targetRps: 10,
                durationSeconds: 5,
            }),
        );
        expect(past && pastScratch(past)).toMatchObject({
            method: 'DELETE',
            url: 'https://api.dev/v1/tasks/7?force=1',
            draft: { query: [{ key: 'force', value: '1' }] },
        });
    });
});

describe('maskedSecret', () => {
    it('names the first value the backend hid', () => {
        expect(
            maskedSecret({
                method: 'GET',
                url: 'http://a/x',
                headers: { Authorization: 'Bearer ***' },
            }),
        ).toBe('Authorization');
        expect(
            maskedSecret({ method: 'GET', url: 'http://a/x', headers: { 'X-Api-Key': '***' } }),
        ).toBe('X-Api-Key');
        expect(maskedSecret({ method: 'GET', url: 'http://a/x?api_key=***&q=1' })).toBe('api_key');
    });

    it('lets re-entered secrets through', () => {
        expect(
            maskedSecret({
                method: 'GET',
                url: 'http://a/x?api_key=k1',
                headers: { Authorization: 'Bearer abc' },
            }),
        ).toBeNull();
    });
});
