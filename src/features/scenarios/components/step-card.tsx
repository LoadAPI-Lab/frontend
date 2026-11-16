import { ChevronDown, Copy, MoreHorizontal, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { MethodBadge } from '@/components/shared/method-badge';
import { IconButton } from '@/components/ui/icon-button';
import { Menu } from '@/components/ui/menu';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';

import { suggestName } from '../response-values';
import type { StepIssue } from '../scenario-checks';
import { addExtractRule, sendsBody, type StepDraft } from '../scenario-draft';
import type { StepResult } from '../use-scenario-run';
import type { SendBlock, StepSend } from '../use-step-sends';
import { ExtractSummary } from './extract-summary';
import { PlaceholderText } from './placeholder-text';
import { StepEditor } from './step-editor';
import { StepIssues } from './step-issues';

export interface StepCardProps {
    step: StepDraft;
    number: number;
    total: number;
    issues: StepIssue[];
    known: ReadonlySet<string>;
    result?: StepResult;
    send: StepSend | undefined;
    sendBlock: SendBlock | null;
    takenNames: ReadonlySet<string>;
    expanded: boolean;
    onExpandedChange: (expanded: boolean) => void;
    onChange: (step: StepDraft) => void;
    onMove: (offset: -1 | 1) => void;
    onDuplicate: () => void;
    onRemove: () => void;
    onSend: () => void;
}

function numberTone(result: StepResult | undefined, invalid: boolean) {
    if (invalid) {
        return 'border-danger/40 bg-danger/10 text-danger';
    }
    if (result?.status === 'OK') {
        return 'border-accent/40 bg-accent/15 text-accent';
    }
    if (result?.status === 'FAILED') {
        return 'border-danger/40 bg-danger/10 text-danger';
    }
    return 'border-border-strong bg-surface-input text-fg-secondary';
}

function ResultTag({ result }: { result: StepResult }) {
    const { t } = useTranslation();
    if (result.status === 'SKIPPED') {
        return (
            <span className="text-fg-muted font-mono text-sm font-bold">
                {t('scenarios.result.skipped')}
            </span>
        );
    }
    const tone = result.status === 'OK' ? 'text-accent' : 'text-danger';
    return (
        <span className="flex items-baseline gap-2 font-mono text-sm tabular-nums">
            {result.durationMs === undefined ? null : (
                <span className="text-fg-muted">
                    {t('scenarios.result.ms', { value: formatNumber(result.durationMs) })}
                </span>
            )}
            <span className={cn('font-bold', tone)}>
                {result.statusCode ?? t('scenarios.result.failed')}
            </span>
        </span>
    );
}

export function StepCard({
    step,
    number,
    total,
    issues,
    known,
    result,
    send,
    sendBlock,
    takenNames,
    expanded,
    onExpandedChange,
    onChange,
    onMove,
    onDuplicate,
    onRemove,
    onSend,
}: StepCardProps) {
    const { t } = useTranslation();
    const invalid = issues.length > 0;
    const rules = step.extract.filter((rule) => rule.key.trim() !== '');
    const bodyPreview = sendsBody(step.method) ? step.body.replaceAll(/\s+/g, ' ').trim() : '';
    const editorId = `step-editor-${step.id}`;

    return (
        <li className="relative flex gap-3">
            <div className="flex flex-col items-center">
                <span
                    className={cn(
                        'flex size-7 shrink-0 items-center justify-center rounded-md border font-mono text-sm font-bold tabular-nums',
                        numberTone(result, invalid),
                    )}
                >
                    {String(number).padStart(2, '0')}
                </span>
                {number < total ? (
                    <span
                        aria-hidden
                        className="bg-border-strong mt-1 w-px flex-1"
                    />
                ) : null}
            </div>
            <article
                aria-label={t('scenarios.step.label', { number, method: step.method })}
                className={cn(
                    'bg-surface-input mb-2.5 min-w-0 flex-1 rounded-lg border transition-colors',
                    expanded ? 'border-border-strong' : 'border-border',
                    invalid && 'border-danger/35',
                )}
            >
                <div className="flex items-center gap-2 px-3 py-2.5">
                    <button
                        type="button"
                        aria-expanded={expanded}
                        aria-controls={editorId}
                        className="focus-visible:ring-accent/40 flex min-w-0 flex-1 items-center gap-2.5 rounded-sm text-left outline-none focus-visible:ring-2"
                        onClick={() => onExpandedChange(!expanded)}
                    >
                        <MethodBadge
                            method={step.method}
                            size="md"
                        />
                        {step.url.trim() === '' ? (
                            <span className="text-fg-muted text-md truncate font-mono">
                                {t('scenarios.step.noUrl')}
                            </span>
                        ) : (
                            <PlaceholderText
                                text={step.url}
                                known={known}
                                className="text-md text-fg min-w-0 truncate"
                            />
                        )}
                        <span className="ml-auto flex shrink-0 items-center gap-2.5 pl-2">
                            {result ? <ResultTag result={result} /> : null}
                            <ChevronDown
                                aria-hidden
                                className={cn(
                                    'text-fg-muted size-3.5 shrink-0 transition-transform motion-reduce:transition-none',
                                    expanded && 'rotate-180',
                                )}
                            />
                        </span>
                    </button>
                    <Menu.Root>
                        <Menu.Trigger
                            render={
                                <IconButton
                                    variant="ghost"
                                    aria-label={t('scenarios.step.actions', { number })}
                                >
                                    <MoreHorizontal />
                                </IconButton>
                            }
                        />
                        <Menu.Popup>
                            <Menu.Item
                                disabled={number === 1}
                                onClick={() => onMove(-1)}
                            >
                                {t('scenarios.step.moveUp')}
                            </Menu.Item>
                            <Menu.Item
                                disabled={number === total}
                                onClick={() => onMove(1)}
                            >
                                {t('scenarios.step.moveDown')}
                            </Menu.Item>
                            <Menu.Item onClick={onDuplicate}>
                                <Copy aria-hidden />
                                {t('scenarios.step.duplicate')}
                            </Menu.Item>
                            <Menu.Separator />
                            <Menu.Item
                                className="text-danger"
                                onClick={onRemove}
                            >
                                <Trash2 aria-hidden />
                                {t('scenarios.step.remove')}
                            </Menu.Item>
                        </Menu.Popup>
                    </Menu.Root>
                </div>
                {expanded ? null : (
                    <div className="flex flex-col gap-2 px-3 pb-3 empty:hidden">
                        {bodyPreview ? (
                            <PlaceholderText
                                text={bodyPreview}
                                known={known}
                                className="bg-surface-code border-border text-fg-secondary block truncate rounded-md border px-3 py-2 text-base"
                            />
                        ) : null}
                        {rules.length > 0 ? (
                            <ExtractSummary
                                number={number}
                                rules={rules}
                            />
                        ) : null}
                        <StepIssues issues={issues} />
                        {result && result.status !== 'OK' && result.description ? (
                            <p
                                className={cn(
                                    'text-base',
                                    result.status === 'FAILED' ? 'text-danger' : 'text-fg-muted',
                                )}
                            >
                                {result.description}
                            </p>
                        ) : null}
                    </div>
                )}
                <div
                    id={editorId}
                    hidden={!expanded}
                >
                    {expanded ? (
                        <>
                            <StepEditor
                                step={step}
                                number={number}
                                variables={[...known]}
                                send={send}
                                sendBlock={sendBlock}
                                onChange={onChange}
                                onSend={onSend}
                                onExtract={(path) =>
                                    onChange(
                                        addExtractRule(
                                            step,
                                            suggestName(path, step.url, takenNames),
                                            path,
                                        ),
                                    )
                                }
                            />
                            <StepIssues
                                issues={issues}
                                className="px-3 pb-3"
                            />
                        </>
                    ) : null}
                </div>
            </article>
        </li>
    );
}
