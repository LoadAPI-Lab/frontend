import { LineCounter, parseDocument } from 'yaml';

import { type ImportIssue, MAX_SPEC_BYTES, specBytes } from './import-spec';

export interface SpecPreview {
    version: string;
    title: string | null;
    endpoints: number;
    tags: number;
}

export type SpecCheck =
    | { kind: 'empty' }
    | { kind: 'issue'; issue: ImportIssue }
    | { kind: 'ready'; preview: SpecPreview };

type DocumentNode = Record<string, unknown>;

const SUPPORTED_VERSION = /^3\.([01])\.\d+$/;

const OPERATION_METHODS = new Set(['get', 'put', 'post', 'delete', 'options', 'head', 'patch']);

const isNode = (value: unknown): value is DocumentNode =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

const issue = (value: ImportIssue): SpecCheck => ({ kind: 'issue', issue: value });

const unescapePointer = (segment: string) =>
    decodeURIComponent(segment).replaceAll('~1', '/').replaceAll('~0', '~');

function resolveLocalRef(root: DocumentNode, value: unknown): unknown {
    const ref = isNode(value) ? value['$ref'] : undefined;
    if (typeof ref !== 'string' || !ref.startsWith('#/')) {
        return value;
    }
    let current: unknown = root;
    for (const segment of ref.slice(2).split('/')) {
        current = isNode(current) ? current[unescapePointer(segment)] : undefined;
    }
    return current;
}

function firstTag(operation: DocumentNode): string | undefined {
    const tags = operation['tags'];
    return Array.isArray(tags) ? tags.find((tag) => typeof tag === 'string') : undefined;
}

function countEndpoints(root: DocumentNode, paths: DocumentNode) {
    let endpoints = 0;
    const tags = new Set<string>();
    for (const [path, value] of Object.entries(paths)) {
        const pathItem = resolveLocalRef(root, value);
        if (path.startsWith('x-') || !isNode(pathItem)) {
            continue;
        }
        for (const [field, operation] of Object.entries(pathItem)) {
            if (OPERATION_METHODS.has(field) && isNode(operation)) {
                endpoints += 1;
                const tag = firstTag(operation);
                if (tag) {
                    tags.add(tag);
                }
            }
        }
    }
    return { endpoints, tags: tags.size };
}

function titleOf(root: DocumentNode): string | null {
    const info = root['info'];
    const title = isNode(info) ? info['title'] : undefined;
    return typeof title === 'string' && title.trim() !== '' ? title.trim() : null;
}

export function checkSpec(content: string): SpecCheck {
    if (content.trim() === '') {
        return { kind: 'empty' };
    }
    if (specBytes(content) > MAX_SPEC_BYTES) {
        return issue({ kind: 'tooLarge' });
    }
    const lineCounter = new LineCounter();
    const document = parseDocument(content, { lineCounter, prettyErrors: false });
    const [syntaxError] = document.errors;
    if (syntaxError) {
        const { line, col } = lineCounter.linePos(syntaxError.pos[0]);
        return issue({ kind: 'syntax', line, column: col, detail: syntaxError.message });
    }
    let root: unknown;
    try {
        root = document.toJS();
    } catch (failure) {
        return issue({
            kind: 'syntax',
            line: null,
            column: null,
            detail: failure instanceof Error ? failure.message : null,
        });
    }
    if (!isNode(root)) {
        return issue({ kind: 'notObject' });
    }
    const version = root['openapi'];
    const match =
        typeof version === 'string' && !Object.hasOwn(root, 'swagger')
            ? SUPPORTED_VERSION.exec(version)
            : null;
    const minor = match?.[1];
    if (minor === undefined) {
        return issue({ kind: 'unsupportedVersion' });
    }
    const paths = root['paths'];
    const pathsOptional = minor === '1' && paths === undefined;
    if (!isNode(paths) && !pathsOptional) {
        return issue({ kind: 'missingPaths' });
    }
    return {
        kind: 'ready',
        preview: {
            version: `3.${minor}`,
            title: titleOf(root),
            ...(isNode(paths) ? countEndpoints(root, paths) : { endpoints: 0, tags: 0 }),
        },
    };
}
