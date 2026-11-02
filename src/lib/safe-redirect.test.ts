import { describe, expect, it } from 'vitest';

import { safeRedirect } from './safe-redirect';

describe('safeRedirect', () => {
    it('keeps app paths', () => {
        expect(safeRedirect('/history?page=2')).toBe('/history?page=2');
    });

    it.each(['https://evil.example', '//evil.example', '/\\evil.example', undefined, 42])(
        'rejects %s',
        (value) => {
            expect(safeRedirect(value)).toBe('/');
        },
    );
});
