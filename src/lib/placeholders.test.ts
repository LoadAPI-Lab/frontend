import { describe, expect, it } from 'vitest';

import { findPlaceholders, generatorToken, unknownGenerators } from './placeholders';

describe('placeholders', () => {
    const body =
        '{"email":"{{$randomEmail}}","id":"{{$uuid}}","token":"{{accessToken}}","x":"{{$nope}}"}';

    it('finds generators and variables with positions', () => {
        const found = findPlaceholders(body);
        expect(found.map((p) => [p.kind, p.name])).toEqual([
            ['generator', 'randomEmail'],
            ['generator', 'uuid'],
            ['variable', 'accessToken'],
            ['generator', 'nope'],
        ]);
        const first = found[0];
        expect(body.slice(first?.start, first?.end)).toBe('{{$randomEmail}}');
    });

    it('reports generators the worker does not know', () => {
        expect(unknownGenerators(body)).toEqual(['nope']);
    });

    it('builds tokens for the insert chips', () => {
        expect(generatorToken('timestamp')).toBe('{{$timestamp}}');
    });
});
