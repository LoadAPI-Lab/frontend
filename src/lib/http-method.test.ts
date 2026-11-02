import { describe, expect, it } from 'vitest';

import { isHttpMethod, methodColorClass } from './http-method';

describe('http-method', () => {
    it('recognises supported methods', () => {
        expect(isHttpMethod('PATCH')).toBe(true);
        expect(isHttpMethod('TRACE')).toBe(false);
    });

    it('maps methods to color classes case-insensitively', () => {
        expect(methodColorClass('post')).toBe('text-method-post');
        expect(methodColorClass('TRACE')).toBe('text-method-other');
    });
});
