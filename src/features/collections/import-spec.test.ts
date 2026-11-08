import { describe, expect, it } from 'vitest';

import { ApiError } from '@/api/fetcher';

import { importIssue, offsetOf, specBytes } from './import-spec';

const coreError = (status: number, code: string, details?: unknown[]) =>
    new ApiError(status, 'failed', 'req_1', { success: false, error: { code }, details }, code);

describe('importIssue', () => {
    it('reads the line and column of a syntax error', () => {
        expect(
            importIssue(
                coreError(400, 'API_SPEC.INVALID_SYNTAX', [
                    {
                        field: 'content',
                        message: 'bad indentation',
                        code: 'yaml_syntax',
                        line: 14,
                        column: 7,
                    },
                ]),
            ),
        ).toEqual({ kind: 'syntax', line: 14, column: 7, detail: 'bad indentation' });
    });

    it('lists each OpenAPI problem with its location', () => {
        expect(
            importIssue(
                coreError(400, 'API_SPEC.INVALID', [
                    {
                        field: 'paths./orders.post.responses',
                        message: 'must have at least one response',
                        code: 'invalid_spec',
                    },
                ]),
            ),
        ).toEqual({
            kind: 'invalid',
            problems: [
                {
                    field: 'paths./orders.post.responses',
                    message: 'must have at least one response',
                },
            ],
        });
    });

    it('recognises unsupported versions and oversized docs', () => {
        expect(importIssue(coreError(400, 'API_SPEC.UNSUPPORTED_VERSION'))).toEqual({
            kind: 'unsupportedVersion',
        });
        expect(importIssue(coreError(413, 'API_SPEC.TOO_LARGE'))).toEqual({ kind: 'tooLarge' });
    });
});

describe('offsetOf', () => {
    it('turns a 1-based line and column into a text offset', () => {
        const text = 'openapi: 3.0.3\ninfo:\n  title: x';
        expect(text.slice(offsetOf(text, 3, 3))).toBe('title: x');
        expect(offsetOf(text, 99, 1)).toBe(text.length);
    });
});

describe('specBytes', () => {
    it('counts UTF-8 bytes, not characters', () => {
        expect(specBytes('é')).toBe(2);
    });
});
