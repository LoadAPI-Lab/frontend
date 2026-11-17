import type { KeyValueRow } from '@/lib/request-draft';

export type JsonLeaf = string | number | boolean | null;

export type ResponseNode =
    | { kind: 'value'; key: string; path: string; value: JsonLeaf; extractable: boolean }
    | {
          kind: 'object' | 'array';
          key: string;
          path: string;
          children: ResponseNode[];
          hidden: number;
      };

export const MAX_ARRAY_ITEMS = 20;
const VARIABLE_RE = /\{\{(\w+)\}\}/g;
const GENERIC_KEYS = new Set([
    'data',
    'result',
    'results',
    'item',
    'items',
    'payload',
    'body',
    'response',
    'value',
    'values',
    'records',
    'content',
]);

export function parseJson(text: string | undefined): { ok: true; value: unknown } | { ok: false } {
    if (text === undefined) {
        return { ok: false };
    }
    try {
        return { ok: true, value: JSON.parse(text) as unknown };
    } catch {
        return { ok: false };
    }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

const joinPath = (parent: string, key: string) => (parent === '' ? key : `${parent}.${key}`);

function nodeOf(key: string, path: string, value: unknown): ResponseNode | null {
    if (Array.isArray(value)) {
        const shown = value.slice(0, MAX_ARRAY_ITEMS);
        return {
            kind: 'array',
            key,
            path,
            children: shown.flatMap((item, index) => {
                const node = nodeOf(String(index), joinPath(path, String(index)), item);
                return node ? [node] : [];
            }),
            hidden: value.length - shown.length,
        };
    }
    if (isRecord(value)) {
        return {
            kind: 'object',
            key,
            path,
            children: Object.entries(value).flatMap(([childKey, child]) => {
                if (childKey === '' || childKey.includes('.')) {
                    return [];
                }
                const node = nodeOf(childKey, joinPath(path, childKey), child);
                return node ? [node] : [];
            }),
            hidden: 0,
        };
    }
    if (
        value === null ||
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean'
    ) {
        return { kind: 'value', key, path, value, extractable: value !== null };
    }
    return null;
}

export function responseTree(body: string | undefined): ResponseNode | null {
    const parsed = parseJson(body);
    if (!parsed.ok) {
        return null;
    }
    return nodeOf('', '', parsed.value);
}

export function extractValue(body: string | undefined, path: string): string | undefined {
    const parsed = parseJson(body);
    if (!parsed.ok || path === '') {
        return undefined;
    }
    let node: unknown = parsed.value;
    for (const segment of path.split('.')) {
        if (Array.isArray(node)) {
            const index = /^\d+$/.test(segment) ? Number(segment) : -1;
            if (index < 0 || index >= node.length) {
                return undefined;
            }
            node = node[index];
        } else if (isRecord(node) && Object.hasOwn(node, segment)) {
            node = node[segment];
        } else {
            return undefined;
        }
    }
    if (typeof node === 'string') {
        return node;
    }
    if (typeof node === 'number' || typeof node === 'boolean') {
        return String(node);
    }
    return undefined;
}

export function substituteVariables(text: string, values: Readonly<Record<string, string>>) {
    return text.replaceAll(VARIABLE_RE, (match, name: string) => values[name] ?? match);
}

const toIdentifier = (text: string) =>
    text.replaceAll(/\W+(\w)/g, (_, letter: string) => letter.toUpperCase()).replaceAll(/\W/g, '');

const singular = (word: string) =>
    word.length > 3 && word.endsWith('s') ? word.slice(0, -1) : word;

const lowerFirst = (word: string) => word.charAt(0).toLowerCase() + word.slice(1);

function resourceFromUrl(url: string): string | undefined {
    const path = url.replace(/^[a-z]+:\/\/[^/]+/i, '').split(/[?#]/)[0] ?? '';
    const segments = path
        .split('/')
        .filter((segment) => /^[a-z][\w-]*$/i.test(segment) && !segment.startsWith('{'));
    const last = segments.at(-1);
    return last ? toIdentifier(singular(last)) : undefined;
}

export function suggestName(path: string, url: string, taken: ReadonlySet<string>): string {
    const segments = path.split('.').filter((segment) => !/^\d+$/.test(segment));
    const last = segments.at(-1) ?? 'value';
    let base = toIdentifier(last) || 'value';
    if (base.toLowerCase() === 'id') {
        const parent = segments.at(-2);
        const owner =
            parent && !GENERIC_KEYS.has(parent.toLowerCase())
                ? toIdentifier(singular(parent))
                : resourceFromUrl(url);
        base = owner ? `${lowerFirst(owner)}Id` : 'id';
    }
    base = lowerFirst(base);
    if (/^\d/.test(base)) {
        base = `v${base}`;
    }
    let name = base;
    for (let suffix = 2; taken.has(name); suffix += 1) {
        name = `${base}${suffix}`;
    }
    return name;
}

export function capturedValues(
    rules: readonly KeyValueRow[],
    body: string | undefined,
): Record<string, string> {
    const values: Record<string, string> = {};
    for (const rule of rules) {
        const name = rule.key.trim();
        const value = extractValue(body, rule.value.trim());
        if (/^\w+$/.test(name) && value !== undefined) {
            values[name] = value;
        }
    }
    return values;
}
