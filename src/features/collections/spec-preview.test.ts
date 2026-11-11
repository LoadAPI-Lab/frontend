import { describe, expect, it } from 'vitest';

import { checkSpec } from './spec-preview';

const petStore = [
    'openapi: 3.1.0',
    'info:',
    '  title: Pet Store',
    '  version: 1.0.0',
    'paths:',
    '  /pets:',
    '    parameters: []',
    '    get:',
    '      tags: [pets]',
    '    post:',
    '      tags: [pets, admin]',
    '    trace:',
    '      tags: [debug]',
    '  /users:',
    '    get:',
    '      tags: [users]',
    '  /health:',
    '    get: {}',
    '  x-internal:',
    '    get: {}',
    '  /legacy:',
    "    $ref: '#/components/pathItems/Legacy'",
    'components:',
    '  pathItems:',
    '    Legacy:',
    '      delete:',
    '        tags: [admin]',
].join('\n');

describe('checkSpec', () => {
    it('counts endpoints and sidebar folders like core and the sidebar do', () => {
        expect(checkSpec(petStore)).toEqual({
            kind: 'ready',
            preview: { version: '3.1', title: 'Pet Store', endpoints: 5, tags: 3 },
        });
    });

    it('reads JSON docs too', () => {
        const doc = JSON.stringify({
            openapi: '3.0.3',
            info: { title: 'Shop API', version: '1' },
            paths: { '/orders': { post: { tags: ['orders'] } } },
        });
        expect(checkSpec(doc)).toEqual({
            kind: 'ready',
            preview: { version: '3.0', title: 'Shop API', endpoints: 1, tags: 1 },
        });
    });

    it('treats a blank doc as empty', () => {
        expect(checkSpec('  \n')).toEqual({ kind: 'empty' });
    });

    it('reports the line and column of a syntax error', () => {
        expect(checkSpec('openapi: 3.0.3\ninfo:\n\ttitle: Broken\npaths: {}')).toEqual({
            kind: 'issue',
            issue: {
                kind: 'syntax',
                line: 3,
                column: 1,
                detail: 'Tabs are not allowed as indentation',
            },
        });
    });

    it('rejects duplicate keys like core does', () => {
        expect(checkSpec('openapi: 3.0.3\nopenapi: 3.1.0\npaths: {}')).toMatchObject({
            issue: { kind: 'syntax', line: 2 },
        });
    });

    it('rejects Swagger 2.0 and unknown versions', () => {
        expect(checkSpec('swagger: "2.0"\npaths: {}')).toEqual({
            kind: 'issue',
            issue: { kind: 'unsupportedVersion' },
        });
        expect(checkSpec('openapi: 3.2.0\npaths: {}')).toEqual({
            kind: 'issue',
            issue: { kind: 'unsupportedVersion' },
        });
    });

    it('needs an object at the root', () => {
        expect(checkSpec('- openapi')).toEqual({ kind: 'issue', issue: { kind: 'notObject' } });
    });

    it('needs paths in 3.0 but not in 3.1', () => {
        expect(checkSpec('openapi: 3.0.3\ninfo:\n  title: X\n')).toEqual({
            kind: 'issue',
            issue: { kind: 'missingPaths' },
        });
        expect(checkSpec('openapi: 3.1.0\ninfo:\n  title: Hooks\nwebhooks: {}\n')).toEqual({
            kind: 'ready',
            preview: { version: '3.1', title: 'Hooks', endpoints: 0, tags: 0 },
        });
    });

    it('stops docs over 5 MB before parsing them', () => {
        expect(checkSpec(`openapi: 3.0.3\n${'x'.repeat(5 * 1024 * 1024)}`)).toEqual({
            kind: 'issue',
            issue: { kind: 'tooLarge' },
        });
    });
});
