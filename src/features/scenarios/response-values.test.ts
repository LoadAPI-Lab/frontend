import { describe, expect, it } from 'vitest';

import { newRow } from '@/lib/request-draft';

import {
    capturedValues,
    extractValue,
    MAX_ARRAY_ITEMS,
    responseTree,
    substituteVariables,
    suggestName,
} from './response-values';

const body = JSON.stringify({
    data: { id: 'task-42', count: 3, done: false, note: null },
    items: [{ id: 'a' }, { id: 'b' }],
    'dotted.key': 'skip',
});

describe('extractValue', () => {
    it('follows the same paths as the worker', () => {
        expect(extractValue(body, 'data.id')).toBe('task-42');
        expect(extractValue(body, 'data.count')).toBe('3');
        expect(extractValue(body, 'data.done')).toBe('false');
        expect(extractValue(body, 'items.1.id')).toBe('b');
    });

    it('gives nothing for missing, null, object and non-JSON values', () => {
        expect(extractValue(body, 'data.missing')).toBeUndefined();
        expect(extractValue(body, 'data.note')).toBeUndefined();
        expect(extractValue(body, 'data')).toBeUndefined();
        expect(extractValue(body, 'items.5.id')).toBeUndefined();
        expect(extractValue(body, 'items.x')).toBeUndefined();
        expect(extractValue('not json', 'data')).toBeUndefined();
        expect(extractValue(body, '')).toBeUndefined();
    });
});

describe('responseTree', () => {
    it('lists every value with its path and skips keys a dot path cannot reach', () => {
        const tree = responseTree(body);
        expect(tree?.kind).toBe('object');
        const paths: string[] = [];
        const walk = (node: NonNullable<typeof tree>) => {
            if (node.kind === 'value') {
                paths.push(`${node.path}:${String(node.extractable)}`);
                return;
            }
            node.children.forEach(walk);
        };
        if (tree) {
            walk(tree);
        }
        expect(paths).toEqual([
            'data.id:true',
            'data.count:true',
            'data.done:true',
            'data.note:false',
            'items.0.id:true',
            'items.1.id:true',
        ]);
    });

    it('shows only the first array items', () => {
        const tree = responseTree(JSON.stringify(Array.from({ length: 25 }, (_, i) => i)));
        expect(tree?.kind === 'array' && tree.children).toHaveLength(MAX_ARRAY_ITEMS);
        expect(tree?.kind === 'array' && tree.hidden).toBe(5);
    });

    it('is empty for a body that is not JSON', () => {
        expect(responseTree('<html>')).toBeNull();
        expect(responseTree('')).toBeNull();
    });
});

describe('suggestName', () => {
    const none = new Set<string>();

    it('uses the last key', () => {
        expect(suggestName('accessToken', 'https://api.dev/auth/login', none)).toBe('accessToken');
        expect(suggestName('meta.next-cursor', 'https://api.dev/x', none)).toBe('nextCursor');
        expect(suggestName('Token', 'https://api.dev/x', none)).toBe('token');
    });

    it('names an id after its owner or the resource in the URL', () => {
        expect(suggestName('data.id', 'https://api.dev/tasks', none)).toBe('taskId');
        expect(suggestName('owner.id', 'https://api.dev/tasks', none)).toBe('ownerId');
        expect(suggestName('items.0.id', 'https://api.dev/v1/projects?page=1', none)).toBe(
            'projectId',
        );
        expect(suggestName('id', 'https://api.dev/{{tenant}}/users', none)).toBe('userId');
        expect(suggestName('id', 'https://api.dev', none)).toBe('id');
    });

    it('does not reuse a taken name', () => {
        expect(suggestName('token', 'https://api.dev', new Set(['token', 'token2']))).toBe(
            'token3',
        );
    });
});

describe('substituteVariables', () => {
    it('fills known variables and leaves generators and unknown names', () => {
        expect(
            substituteVariables('/tasks/{{taskId}}?u={{$uuid}}&x={{other}}', { taskId: '42' }),
        ).toBe('/tasks/42?u={{$uuid}}&x={{other}}');
    });
});

describe('capturedValues', () => {
    it('keeps the values the rules can extract', () => {
        expect(
            capturedValues(
                [newRow('taskId', 'data.id'), newRow('gone', 'data.missing'), newRow('', 'x')],
                body,
            ),
        ).toEqual({ taskId: 'task-42' });
    });
});
