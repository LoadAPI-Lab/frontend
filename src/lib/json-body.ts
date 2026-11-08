import { jsonLanguage } from '@codemirror/lang-json';
import type { SyntaxNode, Tree } from '@lezer/common';

import { findPlaceholders, type Generator, type Placeholder } from './placeholders';

export const TEXT_GENERATORS: readonly Generator[] = ['uuid', 'randomEmail'];

export type BodyIssue =
    | { kind: 'syntax'; from: number; to: number; line: number }
    | { kind: 'unquotedText'; from: number; to: number; line: number; token: string }
    | { kind: 'unknownGenerator'; from: number; to: number; line: number; token: string };

const QUOTED_NODES = new Set(['String', 'PropertyName']);

const isTextGenerator = (name: string) => (TEXT_GENERATORS as readonly string[]).includes(name);

const lineAt = (text: string, offset: number) => text.slice(0, offset).split('\n').length;

function standIn(placeholder: Placeholder): string {
    const length = placeholder.end - placeholder.start;
    if (
        placeholder.kind === 'generator' &&
        placeholder.known &&
        !isTextGenerator(placeholder.name)
    ) {
        return `1${' '.repeat(length - 1)}`;
    }
    return 'a'.repeat(length);
}

function withStandIns(text: string, placeholders: Placeholder[]): string {
    let result = '';
    let last = 0;
    for (const placeholder of placeholders) {
        result += text.slice(last, placeholder.start) + standIn(placeholder);
        last = placeholder.end;
    }
    return result + text.slice(last);
}

export function isInsideString(tree: Tree, offset: number): boolean {
    for (let node: SyntaxNode | null = tree.resolveInner(offset, 1); node; node = node.parent) {
        if (QUOTED_NODES.has(node.name)) {
            return true;
        }
    }
    return false;
}

function firstError(tree: Tree, length: number): { from: number; to: number } {
    const cursor = tree.cursor();
    let error = { from: Math.max(0, length - 1), to: length };
    do {
        if (cursor.type.isError) {
            error = { from: cursor.from, to: cursor.to };
            break;
        }
    } while (cursor.next());
    const from = Math.min(error.from, Math.max(0, length - 1));
    return { from, to: Math.max(error.to, from + 1) };
}

export function validateJsonBody(text: string): BodyIssue[] {
    if (text.trim() === '') {
        return [];
    }
    const placeholders = findPlaceholders(text);
    const issues: BodyIssue[] = placeholders
        .filter((p) => p.kind === 'generator' && !p.known)
        .map((p) => ({
            kind: 'unknownGenerator',
            from: p.start,
            to: p.end,
            line: lineAt(text, p.start),
            token: text.slice(p.start, p.end),
        }));

    const sample = withStandIns(text, placeholders);
    try {
        JSON.parse(sample);
        return issues;
    } catch {
        const tree = jsonLanguage.parser.parse(sample);
        const unquoted: BodyIssue[] = placeholders
            .filter(
                (p) =>
                    p.kind === 'generator' &&
                    p.known &&
                    isTextGenerator(p.name) &&
                    !isInsideString(tree, p.start + 1),
            )
            .map((p) => ({
                kind: 'unquotedText',
                from: p.start,
                to: p.end,
                line: lineAt(text, p.start),
                token: text.slice(p.start, p.end),
            }));
        if (unquoted.length > 0) {
            return [...unquoted, ...issues];
        }
        const error = firstError(tree, text.length);
        return [{ kind: 'syntax', ...error, line: lineAt(text, error.from) }, ...issues];
    }
}

export const isValidJsonBody = (text: string) => validateJsonBody(text).length === 0;
