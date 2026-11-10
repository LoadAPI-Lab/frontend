import { afterEach, describe, expect, it } from 'vitest';

import { editedBodyFor, forgetEditedBody, rememberEditedBody } from './body-memory';

const orders = { spec: 's1', endpoint: 'POST /orders' };
const users = { spec: 's1', endpoint: 'POST /users' };

afterEach(() => sessionStorage.clear());

describe('body memory', () => {
    it('keeps an edited body per endpoint until it is forgotten', () => {
        rememberEditedBody(orders, '{"a":1}');
        rememberEditedBody(users, '{"b":2}');
        rememberEditedBody(orders, '{"a":3}');

        expect(editedBodyFor(orders)).toBe('{"a":3}');
        expect(editedBodyFor(users)).toBe('{"b":2}');

        forgetEditedBody(orders);

        expect(editedBodyFor(orders)).toBeUndefined();
        expect(editedBodyFor(users)).toBe('{"b":2}');
    });

    it('keeps only the latest 50 bodies', () => {
        for (let index = 0; index < 55; index += 1) {
            rememberEditedBody({ spec: 's1', endpoint: `GET /e${index}` }, `${index}`);
        }

        expect(editedBodyFor({ spec: 's1', endpoint: 'GET /e0' })).toBeUndefined();
        expect(editedBodyFor({ spec: 's1', endpoint: 'GET /e54' })).toBe('54');
    });

    it('survives bad stored values', () => {
        sessionStorage.setItem('routelab.tests.bodies', 'not json');

        expect(editedBodyFor(orders)).toBeUndefined();
    });
});
