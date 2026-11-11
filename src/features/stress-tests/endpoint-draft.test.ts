import { afterEach, describe, expect, it } from 'vitest';

import { shopSpec, testServerSpec } from '@/mocks/api-specs';

import { draftFromEndpoint, rememberBody, restoredDraft } from './endpoint-draft';

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

describe('edited bodies', () => {
    const orders = find(shopSpec, 'POST /orders');
    const place = { spec: shopSpec.id, endpoint: orders.key };

    afterEach(() => sessionStorage.clear());

    it('restores an edited body over the example', () => {
        rememberBody(orders, place, '{"quantity": 7}');

        const draft = restoredDraft(orders, place);

        expect(draft.body).toBe('{"quantity": 7}');
        expect(draft.auth).toEqual({ kind: 'bearer', token: '' });
    });

    it('drops the edit once the body matches the example again', () => {
        rememberBody(orders, place, '{"quantity": 7}');
        rememberBody(orders, place, orders.requestBody?.example ?? '');

        expect(restoredDraft(orders, place).body).toBe(orders.requestBody?.example);
    });

    it('keeps an edit to an empty body', () => {
        rememberBody(orders, place, '');

        expect(restoredDraft(orders, place).body).toBe('');
    });
});
