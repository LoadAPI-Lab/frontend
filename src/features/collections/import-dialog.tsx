import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

import type { ApiSpec } from './api';
import {
    importIssue,
    type ImportIssue,
    MAX_SPEC_BYTES,
    offsetOf,
    specBytes,
    useImportSpec,
} from './import-spec';

export interface ImportDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onImported: (spec: ApiSpec) => void;
}

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
    if (issue.kind === 'tooLarge') {
        return <p>{t('importSpec.errors.tooLarge')}</p>;
    }
    return <p>{issue.message}</p>;
}

export function ImportDialog({ open, onOpenChange, onImported }: ImportDialogProps) {
    const { t } = useTranslation();
    const contentRef = useRef<HTMLTextAreaElement>(null);
    const [name, setName] = useState('');
    const [content, setContent] = useState('');
    const importSpec = useImportSpec((spec) => {
        onOpenChange(false);
        setName('');
        setContent('');
        onImported(spec);
    });

    const tooLarge = specBytes(content) > MAX_SPEC_BYTES;
    let issue: ImportIssue | null = null;
    if (tooLarge) {
        issue = { kind: 'tooLarge' };
    } else if (importSpec.isError) {
        issue = importIssue(importSpec.error);
    }

    const submit = () => {
        if (tooLarge || content.trim() === '') {
            return;
        }
        importSpec.mutate(
            { name: name.trim() || undefined, content },
            {
                onError: (error) => {
                    const failed = importIssue(error);
                    const textarea = contentRef.current;
                    if (failed.kind === 'syntax' && failed.line && textarea) {
                        const offset = offsetOf(content, failed.line, failed.column ?? 1);
                        textarea.focus();
                        textarea.setSelectionRange(offset, offset);
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
            <Dialog.Popup className="w-[640px]">
                <Dialog.Title>{t('importSpec.title')}</Dialog.Title>
                <Dialog.Description>{t('importSpec.description')}</Dialog.Description>
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
                            placeholder={t('importSpec.namePlaceholder')}
                            onValueChange={(value) => setName(value)}
                        />
                    </Field.Root>
                    <Field.Root invalid={Boolean(issue)}>
                        <Field.Label>{t('importSpec.content')}</Field.Label>
                        <Textarea
                            ref={contentRef}
                            mono
                            rows={16}
                            value={content}
                            spellCheck={false}
                            placeholder={t('importSpec.contentPlaceholder')}
                            className="max-h-[50dvh] text-sm"
                            onChange={(event) => setContent(event.target.value)}
                        />
                        {issue ? (
                            <Field.Error
                                match
                                className="flex flex-col gap-1 text-base"
                            >
                                <IssueMessage issue={issue} />
                            </Field.Error>
                        ) : null}
                    </Field.Root>
                    <Dialog.Footer>
                        <Dialog.Close
                            render={<Button variant="ghost">{t('importSpec.cancel')}</Button>}
                        />
                        <Button
                            type="submit"
                            variant="primary"
                            className="font-bold"
                            disabled={tooLarge || content.trim() === '' || importSpec.isPending}
                        >
                            {importSpec.isPending
                                ? t('importSpec.importing')
                                : t('importSpec.submit')}
                        </Button>
                    </Dialog.Footer>
                </form>
            </Dialog.Popup>
        </Dialog.Root>
    );
}
