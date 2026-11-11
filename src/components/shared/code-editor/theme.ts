import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import type { Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { tags } from '@lezer/highlight';

const highlight = HighlightStyle.define([
    { tag: tags.propertyName, class: 'text-syntax-key' },
    { tag: [tags.string, tags.content], class: 'text-syntax-string' },
    { tag: [tags.number, tags.bool, tags.null], class: 'text-syntax-number' },
    { tag: tags.comment, class: 'italic' },
]);

const theme = EditorView.theme(
    {
        '&': {
            height: '100%',
            backgroundColor: 'transparent',
            color: 'var(--color-fg-muted)',
            fontSize: 'var(--text-md)',
        },
        '&.cm-focused': { outline: 'none' },
        '.cm-scroller': { fontFamily: 'var(--font-mono)', lineHeight: '25px', padding: '12px 0' },
        '.cm-content': { padding: '0', caretColor: 'var(--color-accent)' },
        '.cm-line': { padding: '0 16px 0 0' },
        '.cm-gutters': {
            backgroundColor: 'transparent',
            border: 'none',
            color: 'var(--color-fg-muted)',
        },
        '.cm-lineNumbers .cm-gutterElement': {
            minWidth: '48px',
            padding: '0 16px',
            textAlign: 'right',
        },
        '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--color-accent)' },
        '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
            backgroundColor: 'color-mix(in oklab, var(--color-accent) 18%, transparent)',
        },
        '.cm-placeholder': { color: 'var(--color-fg-muted)' },
    },
    { dark: true },
);

export const codeTheme: Extension = [theme, syntaxHighlighting(highlight)];
