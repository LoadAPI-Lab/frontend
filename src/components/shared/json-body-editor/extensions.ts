import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { json } from '@codemirror/lang-json';
import { syntaxTree } from '@codemirror/language';
import {
    type EditorState,
    type Extension,
    RangeSetBuilder,
    StateEffect,
    StateField,
} from '@codemirror/state';
import {
    Decoration,
    type DecorationSet,
    EditorView,
    gutterLineClass,
    GutterMarker,
    keymap,
    lineNumbers,
    MatchDecorator,
    placeholder,
    ViewPlugin,
    type ViewUpdate,
} from '@codemirror/view';

import { codeTheme } from '@/components/shared/code-editor/theme';
import { isInsideString, TEXT_GENERATORS, type BodyIssue } from '@/lib/json-body';
import { findPlaceholders, GENERATORS, type Generator, generatorToken } from '@/lib/placeholders';

const pill = Decoration.mark({
    class: 'bg-accent text-accent-fg! [&_*]:text-accent-fg! rounded-[4px] px-1.25 font-semibold',
});
const unknownPill = Decoration.mark({ class: 'text-danger underline decoration-wavy' });

const pills = new MatchDecorator({
    regexp: /\{\{\$(\w+)\}\}/g,
    decoration: (match) =>
        (GENERATORS as readonly string[]).includes(match[1] ?? '') ? pill : unknownPill,
});

const pillPlugin = ViewPlugin.fromClass(
    class {
        decorations: DecorationSet;
        constructor(view: EditorView) {
            this.decorations = pills.createDeco(view);
        }
        update(update: ViewUpdate) {
            this.decorations = pills.updateDeco(update, this.decorations);
        }
    },
    { decorations: (plugin) => plugin.decorations },
);

const placeholderLine = Decoration.line({ class: 'bg-accent/4' });

const placeholderGutter = new (class extends GutterMarker {
    override elementClass = 'bg-accent/4';
})();

function placeholderLineStarts(state: EditorState): number[] {
    const text = state.doc.toString();
    const starts = new Set<number>();
    for (const found of findPlaceholders(text)) {
        if (found.kind === 'generator' && found.known) {
            starts.add(state.doc.lineAt(found.start).from);
        }
    }
    return [...starts].toSorted((a, b) => a - b);
}

const placeholderLines = StateField.define<number[]>({
    create: placeholderLineStarts,
    update: (starts, transaction) =>
        transaction.docChanged ? placeholderLineStarts(transaction.state) : starts,
    provide: (field) => [
        EditorView.decorations.from(field, (starts) => {
            const builder = new RangeSetBuilder<Decoration>();
            for (const start of starts) {
                builder.add(start, start, placeholderLine);
            }
            return builder.finish();
        }),
        gutterLineClass.from(field, (starts) => {
            const builder = new RangeSetBuilder<GutterMarker>();
            for (const start of starts) {
                builder.add(start, start, placeholderGutter);
            }
            return builder.finish();
        }),
    ],
});

const issueMark = Decoration.mark({
    class: 'underline decoration-wavy decoration-danger underline-offset-4',
});

export const setIssues = StateEffect.define<BodyIssue[]>();

const issueField = StateField.define<DecorationSet>({
    create: () => Decoration.none,
    update: (decorations, transaction) => {
        let next = decorations.map(transaction.changes);
        for (const effect of transaction.effects) {
            if (effect.is(setIssues)) {
                const length = transaction.state.doc.length;
                const ranges = effect.value
                    .map((issue) => ({
                        from: Math.min(issue.from, length),
                        to: Math.min(issue.to, length),
                    }))
                    .filter((range) => range.to > range.from)
                    .toSorted((a, b) => a.from - b.from)
                    .map((range) => issueMark.range(range.from, range.to));
                next = Decoration.set(ranges, true);
            }
        }
        return next;
    },
    provide: (field) => EditorView.decorations.from(field),
});

export interface EditorOptions {
    label: string;
    emptyText: string;
    describedBy?: string;
    onDocChange: (text: string) => void;
}

export function editorExtensions({
    label,
    emptyText,
    describedBy,
    onDocChange,
}: EditorOptions): Extension[] {
    return [
        lineNumbers(),
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        json(),
        codeTheme,
        pillPlugin,
        placeholderLines,
        issueField,
        placeholder(emptyText),
        EditorView.contentAttributes.of({
            tabindex: '0',
            'aria-label': label,
            ...(describedBy ? { 'aria-describedby': describedBy } : {}),
        }),
        EditorView.updateListener.of((update) => {
            if (update.docChanged) {
                onDocChange(update.state.doc.toString());
            }
        }),
    ];
}

export function insertGenerator(view: EditorView, name: Generator) {
    const { state } = view;
    const { from, to } = state.selection.main;
    const token = generatorToken(name);
    const quoted =
        (TEXT_GENERATORS as readonly string[]).includes(name) &&
        !isInsideString(syntaxTree(state), from);
    const insert = quoted ? `"${token}"` : token;
    view.dispatch({
        changes: { from, to, insert },
        selection: { anchor: from + insert.length },
        scrollIntoView: true,
        userEvent: 'input',
    });
    view.focus();
}
