import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { SendRequestResponseDto } from '@/api/generated/model';
import { EmptyState } from '@/components/shared/empty-state';
import { CardTitle } from '@/components/ui/card';
import { Tabs } from '@/components/ui/tabs';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';

import type { SendProblem } from './use-send-request';

type ReceivedResponse = Extract<SendRequestResponseDto, { kind: 'response' }>;
type FailedRequest = Extract<SendRequestResponseDto, { kind: 'error' }>;

export interface ResponseCardProps {
    outcome: SendRequestResponseDto | null;
    problem: SendProblem | null;
    sending: boolean;
    className?: string;
}

const STATUS_COLORS: Record<string, string> = {
    '2': 'text-accent',
    '3': 'text-fg-muted',
    '4': 'text-info',
    '5': 'text-danger',
};

const KB = 1024;
const MB = KB * KB;

const tabClass =
    'text-base px-2.75 py-1.75 font-medium aria-selected:font-bold flex items-baseline gap-1.5';

export function prettyBody(body: string): string {
    try {
        return JSON.stringify(JSON.parse(body), null, 2);
    } catch {
        return body;
    }
}

function useUnits() {
    const { t, i18n } = useTranslation();
    const format = (value: number, digits: number) => formatNumber(value, digits, i18n.language);
    return {
        duration: (ms: number) =>
            ms < 1000
                ? t('sendRequest.units.ms', { value: format(ms, ms < 10 ? 1 : 0) })
                : t('sendRequest.units.s', { value: format(ms / 1000, 2) }),
        size: (bytes: number) => {
            if (bytes < KB) {
                return t('sendRequest.units.b', { value: format(bytes, 0) });
            }
            if (bytes < MB) {
                return t('sendRequest.units.kb', { value: format(bytes / KB, 1) });
            }
            return t('sendRequest.units.mb', { value: format(bytes / MB, 1) });
        },
    };
}

function Meta({ items }: { items: { label: string; value: string; className?: string }[] }) {
    return (
        <dl className="text-fg-muted flex items-baseline gap-3 font-mono text-sm tabular-nums">
            {items.map((item) => (
                <div
                    key={item.label}
                    className="flex items-baseline gap-1"
                >
                    <dt className="sr-only">{item.label}</dt>
                    <dd className={item.className}>{item.value}</dd>
                </div>
            ))}
        </dl>
    );
}

function Note({ children }: { children: string }) {
    return <p className="text-fg-muted border-border border-b px-4 py-2 text-sm">{children}</p>;
}

function ResponseBody({ response }: { response: ReceivedResponse }) {
    const { t } = useTranslation();
    const units = useUnits();
    if (response.binary) {
        return <Note>{t('sendRequest.binary', { size: units.size(response.sizeBytes) })}</Note>;
    }
    if (!response.body) {
        return <Note>{t('sendRequest.emptyBody')}</Note>;
    }
    return (
        <>
            {response.bodyTruncated ? <Note>{t('sendRequest.truncated')}</Note> : null}
            <section
                // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex
                tabIndex={0}
                aria-label={t('sendRequest.bodyLabel')}
                className="min-h-0 flex-1 overflow-auto px-4 py-3 outline-none focus-visible:ring-1"
            >
                <pre className="text-syntax-string font-mono text-sm break-all whitespace-pre-wrap">
                    {prettyBody(response.body)}
                </pre>
            </section>
        </>
    );
}

function ResponseHeaders({ response }: { response: ReceivedResponse }) {
    const { t } = useTranslation();
    return (
        <section
            // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex
            tabIndex={0}
            aria-label={t('sendRequest.tabs.headers')}
            className="min-h-0 flex-1 overflow-auto px-4 py-2 outline-none focus-visible:ring-1"
        >
            <table className="w-full font-mono text-sm">
                <thead className="sr-only">
                    <tr>
                        <th scope="col">{t('sendRequest.headers.name')}</th>
                        <th scope="col">{t('sendRequest.headers.value')}</th>
                    </tr>
                </thead>
                <tbody>
                    {response.headers.map((header, index) => (
                        <tr
                            // oxlint-disable-next-line react/no-array-index-key
                            key={`${header.name}-${index}`}
                            className="border-border border-t align-top first:border-t-0"
                        >
                            <th
                                scope="row"
                                className="text-fg-secondary w-2/5 py-1.5 pr-3 text-left font-medium break-all"
                            >
                                {header.name}
                            </th>
                            <td className="text-fg py-1.5 break-all">{header.value}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </section>
    );
}

function Received({ response }: { response: ReceivedResponse }) {
    const { t } = useTranslation();
    const [tab, setTab] = useState('body');
    return (
        <Tabs.Root
            value={tab}
            onValueChange={(next) => setTab(String(next))}
            className="flex min-h-0 flex-1 flex-col"
        >
            <div className="border-border flex h-10 shrink-0 items-center border-b px-3">
                <Tabs.List
                    aria-label={t('sendRequest.title')}
                    className="gap-0.5 border-0 bg-transparent p-0"
                >
                    <Tabs.Tab
                        value="body"
                        className={tabClass}
                    >
                        {t('sendRequest.tabs.body')}
                    </Tabs.Tab>
                    <Tabs.Tab
                        value="headers"
                        className={tabClass}
                    >
                        {t('sendRequest.tabs.headers')}
                        <span className="text-fg-muted font-mono text-sm font-medium tabular-nums">
                            {response.headers.length}
                        </span>
                    </Tabs.Tab>
                </Tabs.List>
            </div>
            <Tabs.Panel
                value="body"
                className="flex min-h-0 flex-1 flex-col"
            >
                <ResponseBody response={response} />
            </Tabs.Panel>
            <Tabs.Panel
                value="headers"
                className="flex min-h-0 flex-1 flex-col"
            >
                <ResponseHeaders response={response} />
            </Tabs.Panel>
        </Tabs.Root>
    );
}

function Failed({ failure }: { failure: FailedRequest }) {
    const { t } = useTranslation();
    return (
        <EmptyState
            size="compact"
            className="my-auto"
            title={t('sendRequest.networkError.title', {
                reason: t(`liveMetrics.statusCodes.network.${failure.error.category}`),
            })}
            description={t('sendRequest.networkError.body')}
        />
    );
}

function ProblemText({ problem }: { problem: SendProblem }) {
    const { t } = useTranslation();
    if (problem.kind === 'targetNotAllowed') {
        return t('sendRequest.problems.targetNotAllowed');
    }
    if (problem.kind === 'rateLimited') {
        return t('sendRequest.problems.rateLimited');
    }
    return t('sendRequest.problems.failed', { message: problem.message });
}

function headerMeta(outcome: SendRequestResponseDto, units: ReturnType<typeof useUnits>) {
    if (outcome.kind === 'error') {
        return [{ label: 'time', value: units.duration(outcome.durationMs) }];
    }
    return [
        {
            label: 'status',
            value: [outcome.status, outcome.statusText].filter(Boolean).join(' '),
            className: cn(
                'font-bold',
                STATUS_COLORS[String(outcome.status).charAt(0)] ?? 'text-fg',
            ),
        },
        { label: 'time', value: units.duration(outcome.durationMs) },
        { label: 'size', value: units.size(outcome.sizeBytes) },
    ];
}

export function ResponseCard({ outcome, problem, sending, className }: ResponseCardProps) {
    const { t } = useTranslation();
    const units = useUnits();
    const labels: Record<string, string> = {
        status: t('sendRequest.status'),
        time: t('sendRequest.time'),
        size: t('sendRequest.size'),
    };
    const meta =
        outcome && !sending && !problem
            ? headerMeta(outcome, units).map((item) => ({
                  ...item,
                  label: labels[item.label] ?? item.label,
              }))
            : [];

    let content = (
        <EmptyState
            size="compact"
            className="my-auto"
            title={t('sendRequest.idle.title')}
            description={t('sendRequest.idle.body')}
        />
    );
    if (sending) {
        content = (
            <output className="text-fg-muted my-auto block text-center text-base">
                {t('sendRequest.waiting')}
            </output>
        );
    } else if (problem) {
        content = (
            <p
                role="alert"
                className="text-danger my-auto px-6 text-center text-base"
            >
                <ProblemText problem={problem} />
            </p>
        );
    } else if (outcome?.kind === 'response') {
        content = <Received response={outcome} />;
    } else if (outcome?.kind === 'error') {
        content = <Failed failure={outcome} />;
    }

    return (
        <section
            aria-label={t('sendRequest.title')}
            aria-busy={sending}
            className={cn(
                'bg-surface-1 border-border flex min-h-0 flex-col overflow-hidden rounded-card border',
                className,
            )}
        >
            <div className="border-border flex h-12 shrink-0 items-center justify-between gap-3 border-b px-4">
                <CardTitle className="text-md font-bold">{t('sendRequest.title')}</CardTitle>
                {meta.length > 0 ? <Meta items={meta} /> : null}
            </div>
            {content}
        </section>
    );
}
