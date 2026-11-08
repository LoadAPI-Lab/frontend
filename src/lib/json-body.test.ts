import { describe, expect, it } from 'vitest';

import { isValidJsonBody, validateJsonBody } from './json-body';

describe('validateJsonBody', () => {
    it('accepts an empty body', () => {
        expect(validateJsonBody('')).toEqual([]);
        expect(validateJsonBody('  \n ')).toEqual([]);
    });

    it('accepts valid JSON with placeholders where they produce valid JSON', () => {
        const body = [
            '{',
            '  "assignee": "{{$randomEmail}}",',
            '  "externalId": "{{$uuid}}",',
            '  "attempt": {{$randomInt}},',
            '  "dueAt": {{$timestamp}},',
            '  "note": "sent at {{$timestamp}}"',
            '}',
        ].join('\n');
        expect(isValidJsonBody(body)).toBe(true);
    });

    it('flags text placeholders outside quotes with their line', () => {
        const body = '{\n  "assignee": {{$randomEmail}},\n  "id": "{{$uuid}}"\n}';
        expect(validateJsonBody(body)).toEqual([
            {
                kind: 'unquotedText',
                from: body.indexOf('{{$randomEmail}}'),
                to: body.indexOf('{{$randomEmail}}') + '{{$randomEmail}}'.length,
                line: 2,
                token: '{{$randomEmail}}',
            },
        ]);
    });

    it('flags unknown generators even when the JSON is valid', () => {
        const body = '{"id": "{{$nope}}"}';
        expect(validateJsonBody(body)).toMatchObject([
            { kind: 'unknownGenerator', token: '{{$nope}}', line: 1 },
        ]);
    });

    it('flags invalid JSON at the line where it breaks', () => {
        const body = '{\n  "title": "Buy milk"\n  "priority": 2\n}';
        const [issue] = validateJsonBody(body);
        expect(issue).toMatchObject({ kind: 'syntax' });
        expect(issue?.line).toBeGreaterThanOrEqual(2);
        expect(issue?.line).toBeLessThanOrEqual(3);
    });

    it('flags a body cut off before its end', () => {
        const body = '{"title": "Buy milk"';
        const [issue] = validateJsonBody(body);
        expect(issue).toMatchObject({ kind: 'syntax', line: 1 });
        expect(issue?.to).toBeLessThanOrEqual(body.length);
    });
});
