import { describe, expect, it } from 'vitest';

import { shopSpec, testServerSpec } from '@/mocks/api-specs';

import {
    onStepPicked,
    parseStepSeed,
    pickStep,
    seedFromEndpoint,
    type StepSeed,
} from './step-seed';

const find = (spec: typeof shopSpec, key: string) => {
    const endpoint = spec.endpoints.find((candidate) => candidate.key === key);
    if (!endpoint) {
        throw new Error(`missing ${key}`);
    }
    return endpoint;
};

describe('seedFromEndpoint', () => {
    it('joins the base URL and path and keeps the example body', () => {
        const seed = seedFromEndpoint(
            find(shopSpec, 'POST /orders'),
            'https://api.shop.example.com/v2/',
        );
        expect(seed.method).toBe('POST');
        expect(seed.url).toBe('https://api.shop.example.com/v2/orders');
        expect(seed.body).toBeDefined();
        expect(seed.headers).toEqual({ 'Content-Type': 'application/json' });
    });

    it('fills path parameters from examples and adds example query values', () => {
        expect(
            seedFromEndpoint(find(testServerSpec, 'GET /status/{code}'), 'http://testserver:8080')
                .url,
        ).toBe('http://testserver:8080/status/429');
        expect(
            seedFromEndpoint(find(testServerSpec, 'GET /fixed'), 'http://testserver:8080').url,
        ).toBe('http://testserver:8080/fixed?delay=10ms&size=1024');
    });
});

describe('step seeds', () => {
    it('parses only valid seeds', () => {
        expect(parseStepSeed('{"method":"GET","url":"http://a.test"}')).toEqual({
            method: 'GET',
            url: 'http://a.test',
        });
        expect(parseStepSeed('{"method":"FETCH","url":"x"}')).toBeNull();
        expect(parseStepSeed('not json')).toBeNull();
    });

    it('delivers picks to listeners until they unsubscribe', () => {
        const seen: StepSeed[] = [];
        const stop = onStepPicked((seed) => seen.push(seed));
        pickStep({ method: 'GET', url: 'http://a.test' });
        stop();
        pickStep({ method: 'GET', url: 'http://b.test' });
        expect(seen).toEqual([{ method: 'GET', url: 'http://a.test' }]);
    });
});
