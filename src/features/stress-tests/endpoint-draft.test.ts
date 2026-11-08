import { describe, expect, it } from 'vitest';

import { shopSpec, testServerSpec } from '@/mocks/api-specs';

import { draftFromEndpoint, placeholderBody } from './endpoint-draft';

const find = (spec: typeof shopSpec, key: string) => {
    const endpoint = spec.endpoints.find((candidate) => candidate.key === key);
    if (!endpoint) {
        throw new Error(`missing ${key}`);
    }
    return endpoint;
};

describe('draftFromEndpoint', () => {
    it('prefills the example body and turns a Bearer header into Bearer auth', () => {
        const draft = draftFromEndpoint(find(shopSpec, 'POST /orders'));
        expect(JSON.parse(draft.body)).toMatchObject({ quantity: 1 });
        expect(draft.auth).toEqual({ kind: 'bearer', token: '' });
        expect(draft.headers).toEqual([]);
    });

    it('prefills path parameters from their examples', () => {
        expect(draftFromEndpoint(find(testServerSpec, 'GET /status/{code}')).pathParams).toEqual({
            code: '429',
        });
        expect(draftFromEndpoint(find(shopSpec, 'GET /products/{productId}')).pathParams).toEqual({
            productId: '',
        });
    });

    it('adds query parameters that are required or have an example', () => {
        const draft = draftFromEndpoint(find(testServerSpec, 'GET /fixed'));
        expect(draft.query.map((row) => [row.key, row.value])).toEqual([
            ['delay', '10ms'],
            ['size', '1024'],
        ]);
    });
});

describe('placeholderBody', () => {
    it('uses a generator for each field type the worker can fill', () => {
        const body = placeholderBody([
            { path: 'productId', type: 'string', format: 'uuid' },
            { path: 'quantity', type: 'integer' },
            { path: 'contact.email', type: 'string', format: 'email' },
            { path: 'gift', type: 'boolean' },
            { path: 'comment', type: 'string' },
        ]);
        expect(body).toBe(
            [
                '{',
                '  "productId": "{{$uuid}}",',
                '  "quantity": {{$randomInt}},',
                '  "contact": {',
                '    "email": "{{$randomEmail}}"',
                '  },',
                '  "gift": true,',
                '  "comment": "string"',
                '}',
            ].join('\n'),
        );
    });
});
