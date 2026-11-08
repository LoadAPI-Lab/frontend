import { describe, expect, it } from 'vitest';

import { unresolvedPathParam } from './target-url';

describe('unresolvedPathParam', () => {
    it('finds {id} and :id segments', () => {
        expect(unresolvedPathParam('https://api.dev/tasks/{id}')).toBe('{id}');
        expect(unresolvedPathParam('https://api.dev/tasks/:id/comments')).toBe(':id');
    });

    it('ignores filled paths, query strings and fragments', () => {
        expect(unresolvedPathParam('https://api.dev/tasks/42')).toBeUndefined();
        expect(unresolvedPathParam('https://api.dev/tasks?filter={id}')).toBeUndefined();
        expect(unresolvedPathParam('https://api.dev/tasks#/{id}')).toBeUndefined();
    });
});
