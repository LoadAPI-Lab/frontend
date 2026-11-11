import { EditorView } from '@codemirror/view';
import { type DragEvent, useDeferredValue, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { CodeEditor, type CodeEditorHandle } from '@/components/shared/code-editor';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { UploadIcon } from '@/components/ui/icons';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/cn';

import type { ApiSpecSummary } from './api';
import {
    importIssue,
    type ImportIssue,
    offsetOf,
    type SavedSpec,
    useImportSpec,
} from './import-spec';
import { readSpecFile, SPEC_FILE_ACCEPT, type SpecFileResult } from './spec-file';
import { checkSpec, type SpecPreview } from './spec-preview';

export interface ImportDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onImported: (saved: SavedSpec) => void;
    replacing?: ApiSpecSummary;
}

type FileIssue = Exclude<SpecFileResult, { kind: 'loaded' }>['kind'];

const hasFiles = (event: DragEvent) => event.dataTransfer.types.includes('Files');

const ignoreFileDrops = EditorView.domEventHandlers({
    drop: (event) => Boolean(event.dataTransfer?.files.length),
});

const editorExtensions = [ignoreFileDrops];

function IssueMessage({ issue }: { issue: ImportIssue }) {
    const { t } = useTranslation();
    if (issue.kind === 'syntax') {
        return (
            <p>
                {issue.line
                    ? t('importSpec.errors.syntaxAt', {
                          line: issue.line,
                          column: issue.column ?? 1,
                          detail: issue.detail ?? t('importSpec.errors.syntax'),
                      })
                    : t('importSpec.errors.syntax')}
            </p>
        );
    }
    if (issue.kind === 'invalid') {
        return (
            <>
                <p>{t('importSpec.errors.invalid')}</p>
                <ul className="flex flex-col gap-1 pl-4">
                    {issue.problems.map((problem) => (
                        <li
                            key={`${problem.field}:${problem.message}`}
                            className="list-disc"
                        >
                            <code className="font-mono">{problem.field}</code>: {problem.message}
                        </li>
                    ))}
                </ul>
            </>
        );
    }
    if (issue.kind === 'unsupportedVersion') {
        return <p>{t('importSpec.errors.unsupportedVersion')}</p>;
    }
    if (issue.kind === 'notObject') {
        return <p>{t('importSpec.errors.notObject')}</p>;
    }
    if (issue.kind === 'missingPaths') {
        return <p>{t('importSpec.errors.missingPaths')}</p>;
    }
    if (issue.kind === 'tooLarge') {
        return <p>{t('importSpec.errors.tooLarge')}</p>;
    }
    return <p>{issue.message}</p>;
}

function PreviewSummary({ preview }: { preview: SpecPreview }) {
    const { t } = useTranslation();
    return (
        <p className="text-fg-secondary">
            {t('importSpec.preview.summary', {
                version: preview.version,
                endpoints: t('importSpec.preview.endpoints', { count: preview.endpoints }),
                tags: t('importSpec.preview.tags', { count: preview.tags }),
            })}
        </p>
    );
}

export function ImportDialog({ open, onOpenChange, onImported, replacing }: ImportDialogProps) {
    const { t } = useTranslation();
    const editorRef = useRef<CodeEditorHandle>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const statusId = useId();
    const [name, setName] = useState('');
    const [content, setContent] = useState('');
    const [fileIssue, setFileIssue] = useState<{ kind: FileIssue; name: string } | null>(null);
    const [dragging, setDragging] = useState(false);
    const checkedContent = useDeferredValue(content);
    const check = checkSpec(checkedContent);
    const importSpec = useImportSpec((saved) => {
        onOpenChange(false);
        setName('');
        setContent('');
        setFileIssue(null);
        onImported(saved);
    }, replacing);

    const preview = check.kind === 'ready' ? check.preview : null;
    const text = replacing
        ? {
              title: t('importSpec.reimport.title', { name: replacing.name }),
              description: t('importSpec.reimport.description'),
              namePlaceholder: t('importSpec.reimport.namePlaceholder', { name: replacing.name }),
              submit: t('importSpec.reimport.submit'),
              pending: t('importSpec.reimport.importing'),
          }
        : {
              title: t('importSpec.title'),
              description: t('importSpec.description'),
              namePlaceholder: preview?.title ?? t('importSpec.namePlaceholder'),
              submit: t('importSpec.submit'),
              pending: t('importSpec.importing'),
          };

    let issue: ImportIssue | null = null;
    if (check.kind === 'issue') {
        issue = check.issue;
    } else if (importSpec.isError) {
        issue = importIssue(importSpec.error);
    }
    const errorLine = issue?.kind === 'syntax' ? issue.line : null;
    const ready = check.kind === 'ready' && checkedContent === content;

    const changeContent = (next: string) => {
        if (next === content) {
            return;
        }
        setContent(next);
        setFileIssue(null);
        if (importSpec.isError) {
            importSpec.reset();
        }
    };

    const loadFile = async (file: File) => {
        const result = await readSpecFile(file);
        if (result.kind === 'loaded') {
            changeContent(result.content);
        } else {
            setFileIssue({ kind: result.kind, name: file.name });
        }
    };

    const submit = () => {
        if (!ready) {
            return;
        }
        importSpec.mutate(
            { name: name.trim() || undefined, content },
            {
                onError: (error) => {
                    const failed = importIssue(error);
                    if (failed.kind === 'syntax' && failed.line) {
                        editorRef.current?.focusAt(
                            offsetOf(content, failed.line, failed.column ?? 1),
                        );
                    }
                },
            },
        );
    };

    return (
        <Dialog.Root
            open={open}
            onOpenChange={onOpenChange}
        >
            <Dialog.Popup
                className="w-[900px]"
                onDragEnter={(event) => {
                    if (hasFiles(event)) {
                        event.preventDefault();
                        setDragging(true);
                    }
                }}
                onDragOver={(event) => {
                    if (hasFiles(event)) {
                        event.preventDefault();
                        event.dataTransfer.dropEffect = 'copy';
                    }
                }}
                onDragLeave={(event) => {
                    const next = event.relatedTarget;
                    if (!(next instanceof Node && event.currentTarget.contains(next))) {
                        setDragging(false);
                    }
                }}
                onDrop={(event) => {
                    event.preventDefault();
                    setDragging(false);
                    const [file] = event.dataTransfer.files;
                    if (file) {
                        void loadFile(file);
                    }
                }}
            >
                <Dialog.Title>{text.title}</Dialog.Title>
                <Dialog.Description>{text.description}</Dialog.Description>
                <form
                    className="flex min-h-0 flex-col gap-4"
                    onSubmit={(event) => {
                        event.preventDefault();
                        submit();
                    }}
                >
                    <Field.Root>
                        <Field.Label>{t('importSpec.name')}</Field.Label>
                        <Input
                            value={name}
                            placeholder={text.namePlaceholder}
                            onValueChange={(value) => setName(value)}
                        />
                    </Field.Root>
                    <div className="flex min-h-0 flex-col gap-1.5">
                        <div className="flex items-end justify-between gap-3">
                            <span className="text-label text-fg-muted font-medium">
                                {t('importSpec.content')}
                            </span>
                            <Button
                                size="sm"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <UploadIcon aria-hidden />
                                {t('importSpec.file.choose')}
                            </Button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                hidden
                                accept={SPEC_FILE_ACCEPT}
                                aria-label={t('importSpec.file.input')}
                                onChange={(event) => {
                                    const input = event.currentTarget;
                                    const [file] = input.files ?? [];
                                    if (file) {
                                        void loadFile(file).finally(() => {
                                            input.value = '';
                                        });
                                    }
                                }}
                            />
                        </div>
                        <CodeEditor
                            ref={editorRef}
                            value={content}
                            onChange={changeContent}
                            label={t('importSpec.content')}
                            language={content.trimStart().startsWith('{') ? 'json' : 'yaml'}
                            placeholder={t('importSpec.contentPlaceholder')}
                            describedBy={statusId}
                            invalid={Boolean(issue)}
                            errorLine={errorLine}
                            extensions={editorExtensions}
                            className={cn(
                                'bg-surface-code rounded-lg border h-[min(50dvh,460px)]',
                                issue ? 'border-danger/60' : 'border-border',
                            )}
                        />
                        <div
                            id={statusId}
                            aria-live="polite"
                            className="flex min-h-6 flex-col gap-1 text-base"
                        >
                            {fileIssue ? (
                                <p className="text-danger">
                                    {t(`importSpec.file.errors.${fileIssue.kind}`, {
                                        name: fileIssue.name,
                                    })}
                                </p>
                            ) : null}
                            {issue ? (
                                <div className="text-danger flex flex-col gap-1">
                                    <IssueMessage issue={issue} />
                                </div>
                            ) : null}
                            {!issue && preview ? <PreviewSummary preview={preview} /> : null}
                            {!issue && !preview && !fileIssue ? (
                                <p className="text-fg-muted">{t('importSpec.file.hint')}</p>
                            ) : null}
                        </div>
                    </div>
                    <Dialog.Footer>
                        <Dialog.Close
                            render={<Button variant="ghost">{t('importSpec.cancel')}</Button>}
                        />
                        <Button
                            type="submit"
                            variant="primary"
                            className="font-bold"
                            disabled={!ready || importSpec.isPending}
                        >
                            {importSpec.isPending ? text.pending : text.submit}
                        </Button>
                    </Dialog.Footer>
                </form>
                {dragging ? (
                    <div
                        aria-hidden
                        className="rounded-card border-accent bg-surface-1/90 text-fg pointer-events-none absolute inset-0 z-10 flex items-center justify-center border-2 border-dashed text-lg font-medium"
                    >
                        {t('importSpec.file.drop')}
                    </div>
                ) : null}
            </Dialog.Popup>
        </Dialog.Root>
    );
}
