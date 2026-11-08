import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { useEffect, useId, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { Chip } from '@/components/ui/chip';
import { cn } from '@/lib/cn';
import { type BodyIssue, validateJsonBody } from '@/lib/json-body';
import { GENERATORS, generatorToken } from '@/lib/placeholders';

import { editorExtensions, insertGenerator, setIssues } from './extensions';

export interface JsonBodyEditorProps {
    value: string;
    onChange: (value: string) => void;
    className?: string;
}

function IssueMessage({ issue }: { issue: BodyIssue }) {
    const { t } = useTranslation();
    if (issue.kind === 'syntax') {
        return t('bodyEditor.issues.syntax', { line: issue.line });
    }
    if (issue.kind === 'unquotedText') {
        return t('bodyEditor.issues.unquotedText', { line: issue.line, token: issue.token });
    }
    return t('bodyEditor.issues.unknownGenerator', {
        line: issue.line,
        token: issue.token,
        known: GENERATORS.map(generatorToken).join(', '),
    });
}

export function JsonBodyEditor({ value, onChange, className }: JsonBodyEditorProps) {
    const { t } = useTranslation();
    const host = useRef<HTMLDivElement>(null);
    const view = useRef<EditorView | null>(null);
    const onChangeRef = useRef(onChange);
    const issuesId = useId();
    const issues = useMemo(() => validateJsonBody(value), [value]);
    const initial = useRef({
        value,
        label: t('bodyEditor.label'),
        emptyText: t('bodyEditor.empty'),
        describedBy: issuesId,
    });

    useEffect(() => {
        onChangeRef.current = onChange;
    }, [onChange]);

    useEffect(() => {
        const { value: doc, label, emptyText, describedBy } = initial.current;
        const editor = host.current
            ? new EditorView({
                  parent: host.current,
                  state: EditorState.create({
                      doc,
                      extensions: editorExtensions({
                          label,
                          emptyText,
                          describedBy,
                          onDocChange: (text) => onChangeRef.current(text),
                      }),
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
        view.current?.dispatch({ effects: setIssues.of(issues) });
    }, [issues]);

    return (
        <div className={cn('flex min-h-0 flex-col', className)}>
            <div
                ref={host}
                className="min-h-40 flex-1 overflow-hidden"
            />
            <ul
                id={issuesId}
                aria-live="polite"
                className={cn('flex flex-col gap-1 px-4 pb-3', issues.length === 0 && 'hidden')}
            >
                {issues.map((issue) => (
                    <li
                        key={`${issue.kind}-${issue.from}`}
                        className="text-danger text-base"
                    >
                        <IssueMessage issue={issue} />
                    </li>
                ))}
            </ul>
            <div className="border-border border-t px-3.5 py-2.75">
                <fieldset className="m-0 min-w-0 border-0 p-0">
                    <legend className="text-fg-muted tracking-label mb-2 p-0 text-xs font-semibold uppercase">
                        {t('bodyEditor.insertPlaceholder')}
                    </legend>
                    <div className="flex flex-wrap gap-1.5">
                        {GENERATORS.map((name) => (
                            <Chip
                                key={name}
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => {
                                    if (view.current) {
                                        insertGenerator(view.current, name);
                                    }
                                }}
                            >
                                {generatorToken(name)}
                            </Chip>
                        ))}
                    </div>
                </fieldset>
            </div>
        </div>
    );
}
