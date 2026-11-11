import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { json } from '@codemirror/lang-json';
import { yaml } from '@codemirror/lang-yaml';
import {
    Compartment,
    EditorState,
    type Extension,
    StateEffect,
    StateField,
} from '@codemirror/state';
import {
    Decoration,
    type DecorationSet,
    EditorView,
    keymap,
    lineNumbers,
    placeholder as placeholderText,
} from '@codemirror/view';
import { type Ref, useEffect, useImperativeHandle, useRef } from 'react';

import { cn } from '@/lib/cn';

import { codeTheme } from './theme';

export type CodeLanguage = 'json' | 'yaml';

export interface CodeEditorHandle {
    focusAt: (offset: number) => void;
}

export interface CodeEditorProps {
    value: string;
    onChange: (value: string) => void;
    label: string;
    language: CodeLanguage;
    placeholder?: string;
    describedBy?: string;
    invalid?: boolean;
    errorLine?: number | null;
    extensions?: Extension[];
    className?: string;
    ref?: Ref<CodeEditorHandle>;
}

const languageExtension = (language: CodeLanguage) => (language === 'json' ? json() : yaml());

const contentAttributes = (label: string, describedBy?: string, invalid?: boolean) =>
    EditorView.contentAttributes.of({
        tabindex: '0',
        'aria-label': label,
        ...(describedBy ? { 'aria-describedby': describedBy } : {}),
        ...(invalid ? { 'aria-invalid': 'true' } : {}),
    });

const errorLineMark = Decoration.line({ class: 'bg-danger/10' });

const setErrorLine = StateEffect.define<number | null>();

const errorLineField = StateField.define<DecorationSet>({
    create: () => Decoration.none,
    update: (decorations, transaction) => {
        let next = decorations.map(transaction.changes);
        for (const effect of transaction.effects) {
            if (effect.is(setErrorLine)) {
                const { doc } = transaction.state;
                const line = effect.value;
                next =
                    line !== null && line >= 1 && line <= doc.lines
                        ? Decoration.set([errorLineMark.range(doc.line(line).from)])
                        : Decoration.none;
            }
        }
        return next;
    },
    provide: (field) => EditorView.decorations.from(field),
});

export function CodeEditor({
    value,
    onChange,
    label,
    language,
    placeholder,
    describedBy,
    invalid,
    errorLine = null,
    extensions,
    className,
    ref,
}: CodeEditorProps) {
    const host = useRef<HTMLDivElement>(null);
    const view = useRef<EditorView | null>(null);
    const onChangeRef = useRef(onChange);
    const compartments = useRef({ language: new Compartment(), attributes: new Compartment() });
    const initial = useRef({
        value,
        language,
        placeholder,
        extensions,
        attributes: contentAttributes(label, describedBy, invalid),
    });

    useEffect(() => {
        onChangeRef.current = onChange;
    }, [onChange]);

    useEffect(() => {
        const { language: languageCompartment, attributes: attributesCompartment } =
            compartments.current;
        const options = initial.current;
        const editor = host.current
            ? new EditorView({
                  parent: host.current,
                  state: EditorState.create({
                      doc: options.value,
                      extensions: [
                          lineNumbers(),
                          history(),
                          keymap.of([...defaultKeymap, ...historyKeymap]),
                          languageCompartment.of(languageExtension(options.language)),
                          codeTheme,
                          errorLineField,
                          options.placeholder ? placeholderText(options.placeholder) : [],
                          attributesCompartment.of(options.attributes),
                          options.extensions ?? [],
                          EditorView.updateListener.of((update) => {
                              if (update.docChanged) {
                                  onChangeRef.current(update.state.doc.toString());
                              }
                          }),
                      ],
                  }),
              })
            : null;
        view.current = editor;
        return () => {
            editor?.destroy();
            view.current = null;
        };
    }, []);

    useEffect(() => {
        const editor = view.current;
        if (editor && editor.state.doc.toString() !== value) {
            editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: value } });
        }
    }, [value]);

    useEffect(() => {
        view.current?.dispatch({
            effects: compartments.current.language.reconfigure(languageExtension(language)),
        });
    }, [language]);

    useEffect(() => {
        view.current?.dispatch({
            effects: compartments.current.attributes.reconfigure(
                contentAttributes(label, describedBy, invalid),
            ),
        });
    }, [label, describedBy, invalid]);

    useEffect(() => {
        view.current?.dispatch({ effects: setErrorLine.of(errorLine) });
    }, [errorLine, value]);

    useImperativeHandle(
        ref,
        () => ({
            focusAt: (offset) => {
                const editor = view.current;
                if (!editor) {
                    return;
                }
                const anchor = Math.min(Math.max(0, offset), editor.state.doc.length);
                editor.dispatch({ selection: { anchor }, scrollIntoView: true });
                editor.focus();
            },
        }),
        [],
    );

    return (
        <div
            ref={host}
            className={cn('min-h-40 overflow-hidden', className)}
        />
    );
}
