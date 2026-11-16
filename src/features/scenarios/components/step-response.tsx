import { ArrowRight, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { SendRequestResponseDto } from '@/api/generated/model';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';
import type { KeyValueRow } from '@/lib/request-draft';
import type { SendProblem } from '@/lib/send-problem';

import { type JsonLeaf, type ResponseNode, responseTree } from '../response-values';
import type { StepSend } from '../use-step-sends';

type ReceivedResponse = Extract<SendRequestResponseDto, { kind: 'response' }>;

export interface StepResponseProps {
    number: number;
    send: StepSend;
    rules: readonly KeyValueRow[];
    onExtract: (path: string) => void;
}

const KB = 1024;

const STATUS_COLORS: Record<string, string> = {
    '2': 'text-accent',
    '3': 'text-fg-muted',
    '4': 'text-info',
    '5': 'text-danger',
};

function leafClass(value: JsonLeaf) {
    if (typeof value === 'string') {
        return 'text-syntax-string';
    }
    if (value === null) {
        return 'text-fg-muted';
    }
    return 'text-syntax-number';
}

const leafText = (value: JsonLeaf) => (typeof value === 'string' ? `"${value}"` : String(value));

function useUnits() {
    const { t, i18n } = useTranslation();
    const format = (value: number, digits: number) => formatNumber(value, digits, i18n.language);
    return {
        duration: (ms: number) =>
            ms < 1000
                ? t('sendRequest.units.ms', { value: format(ms, ms < 10 ? 1 : 0) })
                : t('sendRequest.units.s', { value: format(ms / 1000, 2) }),
        size: (bytes: number) =>
            bytes < KB
                ? t('sendRequest.units.b', { value: format(bytes, 0) })
                : t('sendRequest.units.kb', { value: format(bytes / KB, 1) }),
    };
}

function problemText(t: ReturnType<typeof useTranslation>['t'], problem: SendProblem) {
    if (problem.kind === 'targetNotAllowed') {
        return t('sendRequest.problems.targetNotAllowed');
    }
    if (problem.kind === 'rateLimited') {
        return t('sendRequest.problems.rateLimited');
    }
    return t('sendRequest.problems.failed', { message: problem.message });
}

interface TreeProps {
    nodes: ResponseNode[];
    extracted: ReadonlyMap<string, string>;
    onExtract: (path: string) => void;
    root?: boolean;
}

function Tree({ nodes, extracted, onExtract, root = false }: TreeProps) {
    const { t } = useTranslation();
    return (
        <ul className={cn('flex flex-col', !root && 'border-border ml-1.5 border-l pl-3')}>
            {nodes.map((node) => {
                if (node.kind !== 'value') {
                    return (
                        <li
                            key={node.path}
                            className="flex flex-col"
                        >
                            <span className="text-syntax-key py-0.5">
                                {node.key}
                                <span className="text-fg-muted">
                                    {node.kind === 'array' ? ' [ ]' : ' { }'}
                                </span>
                            </span>
                            {node.children.length > 0 ? (
                                <Tree
                                    nodes={node.children}
                                    extracted={extracted}
                                    onExtract={onExtract}
                                />
                            ) : null}
                            {node.hidden > 0 ? (
                                <span className="text-fg-muted border-border ml-1.5 border-l py-0.5 pl-3 font-sans">
                                    {t('scenarios.response.moreItems', { count: node.hidden })}
                                </span>
                            ) : null}
                        </li>
                    );
                }
                const name = extracted.get(node.path);
                const row = (
                    <>
                        <span className="text-syntax-key shrink-0">{node.key}</span>
                        <span className="sr-only">: </span>
                        <span className={cn('min-w-0 truncate', leafClass(node.value))}>
                            {leafText(node.value)}
                        </span>
                    </>
                );
                if (name !== undefined) {
                    return (
                        <li
                            key={node.path}
                            className="flex items-baseline gap-2 py-0.5"
                        >
                            {row}
                            <ArrowRight
                                aria-hidden
                                className="text-fg-muted size-3 shrink-0 self-center"
                            />
                            <span className="sr-only">{t('scenarios.extract.into')}</span>
                            <span className="bg-accent text-accent-fg shrink-0 rounded-xs px-1.5 py-0.5 text-sm leading-none font-bold">
                                {name}
                            </span>
                        </li>
                    );
                }
                if (!node.extractable) {
                    return (
                        <li
                            key={node.path}
                            className="flex items-baseline gap-2 py-0.5"
                        >
                            {row}
                        </li>
                    );
                }
                return (
                    <li key={node.path}>
                        <button
                            type="button"
                            className="group hover:bg-accent/10 focus-visible:ring-accent/40 -mx-1.5 flex w-[calc(100%+0.75rem)] items-baseline gap-2 rounded-sm px-1.5 py-0.5 text-left outline-none focus-visible:ring-2"
                            onClick={() => onExtract(node.path)}
                        >
                            {row}
                            <span className="sr-only">, </span>
                            <span className="text-accent ml-auto flex shrink-0 items-center gap-1 self-center font-sans text-sm font-semibold opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100">
                                <Plus
                                    aria-hidden
                                    className="size-3"
                                />
                                {t('scenarios.extract.label')}
                            </span>
                            <span className="sr-only"> {node.path}</span>
                        </button>
                    </li>
                );
            })}
        </ul>
    );
}

function Received({
    response,
    rules,
    onExtract,
}: {
    response: ReceivedResponse;
    rules: readonly KeyValueRow[];
    onExtract: (path: string) => void;
}) {
    const { t } = useTranslation();
    const units = useUnits();
    const tree = response.bodyTruncated ? null : responseTree(response.body);
    const extracted = new Map(
        rules
            .filter((rule) => rule.key.trim() !== '' && rule.value.trim() !== '')
            .map((rule) => [rule.value.trim(), rule.key.trim()]),
    );

    let content;
    if (response.binary) {
        content = t('sendRequest.binary', { size: units.size(response.sizeBytes) });
    } else if (!response.body) {
        content = t('sendRequest.emptyBody');
    } else if (!tree || tree.kind === 'value') {
        content = t('scenarios.response.notJson');
    }

    return (
        <div className="flex flex-col gap-2">
            <dl className="text-fg-muted flex items-baseline gap-3 font-mono text-sm tabular-nums">
                <div>
                    <dt className="sr-only">{t('sendRequest.status')}</dt>
                    <dd
                        className={cn(
                            'font-bold',
                            STATUS_COLORS[String(response.status).charAt(0)] ?? 'text-fg',
                        )}
                    >
                        {[response.status, response.statusText].filter(Boolean).join(' ')}
                    </dd>
                </div>
                <div>
                    <dt className="sr-only">{t('sendRequest.time')}</dt>
                    <dd>{units.duration(response.durationMs)}</dd>
                </div>
                <div>
                    <dt className="sr-only">{t('sendRequest.size')}</dt>
                    <dd>{units.size(response.sizeBytes)}</dd>
                </div>
            </dl>
            {content === undefined && tree && tree.kind !== 'value' ? (
                <>
                    <p className="text-fg-muted text-base">{t('scenarios.response.pickHint')}</p>
                    <section
                        // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex
                        tabIndex={0}
                        aria-label={t('sendRequest.bodyLabel')}
                        className="bg-surface-code border-border focus-visible:ring-accent/40 max-h-80 overflow-auto rounded-md border px-3 py-2 font-mono text-base outline-none focus-visible:ring-2"
                    >
                        {tree.children.length > 0 ? (
                            <Tree
                                root
                                nodes={tree.children}
                                extracted={extracted}
                                onExtract={onExtract}
                            />
                        ) : (
                            <span className="text-fg-muted">
                                {tree.kind === 'array' ? '[ ]' : '{ }'}
                            </span>
                        )}
                    </section>
                </>
            ) : (
                <>
                    <p className="text-fg-muted text-base">{content}</p>
                    {response.body && !response.binary ? (
                        <pre className="bg-surface-code border-border text-fg-secondary max-h-60 overflow-auto rounded-md border px-3 py-2 font-mono text-sm break-all whitespace-pre-wrap">
                            {response.body}
                        </pre>
                    ) : null}
                </>
            )}
        </div>
    );
}

export function StepResponse({ number, send, rules, onExtract }: StepResponseProps) {
    const { t } = useTranslation();
    let content;
    if (send.sending) {
        content = <p className="text-fg-muted text-base">{t('sendRequest.waiting')}</p>;
    } else if (send.problem) {
        content = (
            <p
                role="alert"
                className="text-danger text-base"
            >
                {problemText(t, send.problem)}
            </p>
        );
    } else if (send.outcome?.kind === 'error') {
        content = (
            <p
                role="alert"
                className="text-danger text-base"
            >
                {t('sendRequest.networkError.title', {
                    reason: t(`liveMetrics.statusCodes.network.${send.outcome.error.category}`),
                })}
            </p>
        );
    } else if (send.outcome) {
        content = (
            <Received
                response={send.outcome}
                rules={rules}
                onExtract={onExtract}
            />
        );
    }
    return (
        <section
            aria-label={t('scenarios.response.label', { number })}
            aria-busy={send.sending}
        >
            {content}
        </section>
    );
}
