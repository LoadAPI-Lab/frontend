import { LoaderCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { RunStatus } from '@/api/live';
import { StatCard, StatList } from '@/components/shared/stat-card';
import { Card, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/cn';
import { formatNumber, formatRelativeTime } from '@/lib/format';
import { methodColorClass } from '@/lib/http-method';

import type { ScenarioResult, ScenarioRunPhase, StepResult } from '../use-scenario-run';

export interface RunPanelProps {
    phase: ScenarioRunPhase;
    hasRun: boolean;
    status: RunStatus | null;
    reason: string | null;
    result: ScenarioResult | null;
    loadingResult: boolean;
    stale: boolean;
    finishedAt: string | null;
}

function urlPath(url: string) {
    const match = /^https?:\/\/[^/]+(?<path>.*)$/i.exec(url);
    return match?.groups?.['path'] || url;
}

function StepOutcome({ step }: { step: StepResult }) {
    const { t } = useTranslation();
    if (step.status === 'SKIPPED') {
        return (
            <span className="text-fg-muted font-mono text-sm font-bold">
                {t('scenarios.result.skipped')}
            </span>
        );
    }
    return (
        <span
            className={cn(
                'font-mono text-sm font-bold tabular-nums',
                step.status === 'OK' ? 'text-accent' : 'text-danger',
            )}
        >
            {step.statusCode ?? t('scenarios.result.failed')}
        </span>
    );
}

function Summary({ result }: { result: ScenarioResult }) {
    const { t } = useTranslation();
    const { summary } = result;
    return (
        <StatList className="grid-cols-3 gap-2">
            <StatCard
                label={t('scenarios.result.passed')}
                value={`${summary.okCount}/${summary.totalSteps}`}
                className="px-3"
            />
            <StatCard
                label={t('scenarios.result.totalTime')}
                value={formatNumber(summary.durationMs)}
                unit={t('scenarios.result.msUnit')}
                className="px-3"
            />
            <StatCard
                label={
                    summary.failedCount > 0
                        ? t('scenarios.result.failedCount')
                        : t('scenarios.result.skippedCount')
                }
                value={formatNumber(
                    summary.failedCount > 0 ? summary.failedCount : summary.skippedCount,
                )}
                tone={summary.failedCount + summary.skippedCount > 0 ? 'danger' : 'default'}
                className="px-3"
            />
        </StatList>
    );
}

function StepRows({ steps }: { steps: StepResult[] }) {
    const { t } = useTranslation();
    return (
        <ol className="divide-border flex flex-col divide-y">
            {steps.map((step, index) => (
                <li
                    // oxlint-disable-next-line react/no-array-index-key
                    key={`${index}-${step.url}`}
                    className="flex flex-col gap-1 py-2.5"
                >
                    <div className="flex items-center gap-2.5">
                        <span
                            className={cn(
                                'flex size-5.5 shrink-0 items-center justify-center rounded-xs font-mono text-2xs font-bold tabular-nums',
                                step.status === 'OK'
                                    ? 'bg-accent/15 text-accent'
                                    : 'bg-surface-2 text-fg-muted',
                                step.status === 'FAILED' && 'bg-danger/14 text-danger',
                            )}
                        >
                            {String(index + 1).padStart(2, '0')}
                        </span>
                        <span className="text-label min-w-0 flex-1 truncate font-mono">
                            <span className={cn('font-bold', methodColorClass(step.method))}>
                                {step.method}
                            </span>{' '}
                            <span className="text-fg-secondary">{urlPath(step.url)}</span>
                            {step.durationMs === undefined ? null : (
                                <span className="text-fg-muted">
                                    {' · '}
                                    {t('scenarios.result.ms', {
                                        value: formatNumber(step.durationMs),
                                    })}
                                </span>
                            )}
                        </span>
                        <StepOutcome step={step} />
                    </div>
                    {step.status !== 'OK' && step.description ? (
                        <p
                            className={cn(
                                'pl-8 text-base',
                                step.status === 'FAILED' ? 'text-danger' : 'text-fg-muted',
                            )}
                        >
                            {step.description}
                        </p>
                    ) : null}
                </li>
            ))}
        </ol>
    );
}

export function RunPanel({
    phase,
    hasRun,
    status,
    reason,
    result,
    loadingResult,
    stale,
    finishedAt,
}: RunPanelProps) {
    const { t, i18n } = useTranslation();
    const busy = phase !== 'idle';

    return (
        <div className="flex flex-col gap-3">
            {result && !busy ? <Summary result={result} /> : null}
            <Card
                aria-labelledby="scenario-last-run"
                aria-busy={busy || loadingResult}
                className="flex flex-col gap-2"
            >
                <div className="flex items-baseline justify-between gap-2">
                    <CardTitle
                        id="scenario-last-run"
                        className="text-md"
                    >
                        {t('scenarios.run.lastRun')}
                    </CardTitle>
                    {finishedAt && !busy ? (
                        <span className="text-fg-muted font-mono text-sm">
                            {formatRelativeTime(finishedAt, i18n.language)}
                        </span>
                    ) : null}
                </div>
                {busy ? (
                    <p className="text-fg-secondary flex items-center gap-2 text-base">
                        <LoaderCircle
                            aria-hidden
                            className="text-accent size-3.5 motion-safe:animate-spin"
                        />
                        {phase === 'stopping'
                            ? t('scenarios.run.stopping')
                            : t('scenarios.run.running')}
                    </p>
                ) : null}
                {!busy && !hasRun ? (
                    <p className="text-fg-muted text-base">{t('scenarios.run.never')}</p>
                ) : null}
                {!busy && loadingResult ? (
                    <div className="flex flex-col gap-2 py-1">
                        <Skeleton className="h-5" />
                        <Skeleton className="h-5 w-4/5" />
                    </div>
                ) : null}
                {!busy && hasRun && stale && result ? (
                    <p className="border-warning/30 bg-warning/10 text-warning rounded-md border px-2.5 py-1.5 text-base">
                        {t('scenarios.run.stale')}
                    </p>
                ) : null}
                {!busy && status === 'STOPPED' ? (
                    <p className="text-fg-muted text-base">{t('scenarios.run.stopped')}</p>
                ) : null}
                {!busy && status === 'FAILED' ? (
                    <p className="border-danger/35 bg-danger/10 text-danger rounded-md border px-2.5 py-2 text-base">
                        {reason ?? t('scenarios.run.failed')}
                    </p>
                ) : null}
                {!busy && result ? <StepRows steps={result.steps} /> : null}
            </Card>
        </div>
    );
}
