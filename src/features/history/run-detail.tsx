import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { Download, RotateCcw } from 'lucide-react';
import { type ReactNode, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { ApiError } from '@/api/fetcher';
import {
    getTestRunsGetQueryOptions,
    getTestRunsListQueryKey,
    testRunsRerun,
} from '@/api/generated/endpoints/test-runs/test-runs';
import type { TestRunResponseDto } from '@/api/generated/model';
import { isFinalStatus, type RunSummary, summarizeRunResult } from '@/api/live';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { StatCard, StatList } from '@/components/shared/stat-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/toast';
import { RunFailure, StatusCodesCard } from '@/features/live-metrics';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';
import { methodBackgroundClass } from '@/lib/http-method';
import { placeOfRun, placeSearch, rememberRun } from '@/lib/run-memory';

import { routeRuns, type RunListItem } from './history-api';
import {
    chartsReplayable,
    formatRunDateTime,
    percentChange,
    runHost,
    runOrigin,
    runPath,
    shortRunId,
    trendWidth,
} from './history-format';
import { STATUS_TEXT } from './run-status';

const ROUTE_RUNS = 5;

type SingleConfig = Extract<TestRunResponseDto['config'], { target: unknown }>;

const isSingleConfig = (config: TestRunResponseDto['config']): config is SingleConfig =>
    'target' in config;

interface DeltaProps {
    value: number | null;
    label: string;
    better: 'up' | 'down';
}

function Delta({ value, label, better }: DeltaProps) {
    if (value === null || !Number.isFinite(value)) {
        return null;
    }
    let tone = 'bg-surface-2 text-fg-muted';
    let arrow = '=';
    if (value !== 0) {
        const good = better === 'up' ? value > 0 : value < 0;
        tone = good ? 'bg-accent/12 text-accent' : 'bg-danger/12 text-danger';
        arrow = value > 0 ? '▲' : '▼';
    }
    return (
        <span className={cn('rounded-sm px-1.5 py-0.5 font-mono text-xs font-semibold', tone)}>
            {arrow} {label}
        </span>
    );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="flex min-w-0 flex-col gap-0.5">
            <dt className="text-fg-muted text-sm">{label}</dt>
            <dd className="text-fg truncate font-mono text-base">{children}</dd>
        </div>
    );
}

function download(run: TestRunResponseDto) {
    const blob = new Blob([JSON.stringify(run, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `loadapi-run-${shortRunId(run.id)}.json`;
    link.click();
    URL.revokeObjectURL(url);
}

function authKind(headers: Record<string, string> | undefined) {
    const entry = Object.entries(headers ?? {}).find(
        ([name]) => name.toLowerCase() === 'authorization',
    );
    if (!entry) {
        return 'noAuth' as const;
    }
    return /^bearer\b/i.test(entry[1]) ? ('bearer' as const) : ('authHeader' as const);
}

export interface RunDetailProps {
    runId: string;
    listItems: readonly RunListItem[];
    className?: string;
}

const ACTIVE_POLL_MS = 2000;
const HIGH_ERROR_RATE = 0.01;

export function RunDetail({ runId, listItems, className }: RunDetailProps) {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const format = (value: number, digits = 0) => formatNumber(value, digits, i18n.language);
    const ms = (value: number) => t('history.ms', { value: format(value) });

    const queryClient = useQueryClient();
    const runQuery = useQuery({
        ...getTestRunsGetQueryOptions(runId),
        retry: false,
        refetchInterval: (query) =>
            query.state.data && !isFinalStatus(query.state.data.status) ? ACTIVE_POLL_MS : false,
    });
    const runStatus = runQuery.data?.status;
    const runFinal = isFinalStatus(runStatus);
    useEffect(() => {
        if (runFinal) {
            void queryClient.invalidateQueries({ queryKey: getTestRunsListQueryKey() });
        }
    }, [runFinal, queryClient]);
    const sameRoute = routeRuns(listItems, runId, ROUTE_RUNS);
    const maxP95 = Math.max(0, ...sameRoute.map((item) => item.p95Ms ?? 0));
    const previousId = sameRoute[1]?.id;
    const routeDetails = useQueries({
        queries: sameRoute.map((item) => ({ ...getTestRunsGetQueryOptions(item.id) })),
    });
    const summaries = new Map<string, RunSummary | null>(
        sameRoute.map((item, index) => [
            item.id,
            summarizeRunResult(routeDetails[index]?.data?.result),
        ]),
    );

    const rerun = useMutation({
        mutationFn: (id: string) =>
            testRunsRerun(id, { headers: { 'Idempotency-Key': crypto.randomUUID() } }),
        meta: { toastOnError: false },
        onSuccess: (created) => {
            const place = placeOfRun(runId);
            if (place) {
                rememberRun(created.id, place);
            }
            void navigate({ to: '/tests', search: { ...placeSearch(place), run: created.id } });
        },
        onError: (error) => {
            toast.error({
                title: t('history.rerunFailed'),
                description:
                    error instanceof ApiError && error.code === 'TEST_RUN.CAPACITY_EXCEEDED'
                        ? t('testConfig.capacityExceeded')
                        : error.message,
            });
        },
    });

    if (runQuery.isPending) {
        return (
            <div className={cn('flex flex-col gap-3', className)}>
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }
    if (runQuery.isError) {
        if (runQuery.error instanceof ApiError && runQuery.error.status === 404) {
            return (
                <EmptyState
                    title={t('history.notFound.title')}
                    description={t('history.notFound.body')}
                    className={className}
                />
            );
        }
        return (
            <ErrorState
                message={runQuery.error.message}
                requestId={runQuery.error instanceof ApiError ? runQuery.error.requestId : null}
                onRetry={() => void runQuery.refetch()}
                retrying={runQuery.isRefetching}
                className={className}
            />
        );
    }

    const run = runQuery.data;
    const single = isSingleConfig(run.config) ? run.config : null;
    const summary = summarizeRunResult(run.result);
    const previous = previousId ? (summaries.get(previousId) ?? null) : null;
    const latency = summary?.latency ?? null;
    const before = previous?.latency ?? null;
    const route = single?.target;

    const percentRow = (key: 'p50Ms' | 'p95Ms' | 'p99Ms', label: string) => {
        if (!latency) {
            return null;
        }
        const scale = Math.max(latency.p99Ms, before?.p99Ms ?? 0, 1);
        return (
            <div
                key={key}
                className="grid grid-cols-[2.5rem_1fr_auto] items-center gap-3"
            >
                <span className="text-fg-muted font-mono text-sm">{label}</span>
                <span className="flex flex-col gap-1">
                    <span className="bg-track h-1.5 overflow-hidden rounded-xs">
                        <span
                            className="bg-accent block h-full rounded-xs"
                            style={{ width: `${(latency[key] / scale) * 100}%` }}
                        />
                    </span>
                    {before ? (
                        <span className="bg-track h-1.5 overflow-hidden rounded-xs">
                            <span
                                className="bg-fg-disabled block h-full rounded-xs"
                                style={{ width: `${(before[key] / scale) * 100}%` }}
                            />
                        </span>
                    ) : null}
                </span>
                <span className="flex flex-col items-end">
                    <span className="text-fg font-mono text-base font-bold tabular-nums">
                        {ms(latency[key])}
                    </span>
                    {before ? (
                        <span className="text-fg-muted font-mono text-xs tabular-nums">
                            {ms(before[key])}
                        </span>
                    ) : null}
                </span>
            </div>
        );
    };

    return (
        <article
            aria-labelledby="run-detail-title"
            className={cn('flex flex-col gap-3', className)}
        >
            <header className="flex items-start gap-4">
                {route ? (
                    <span
                        className={cn(
                            'text-accent-fg text-control flex size-11.5 shrink-0 items-center justify-center rounded-[10px] font-mono font-extrabold',
                            methodBackgroundClass(route.method),
                        )}
                    >
                        {route.method}
                    </span>
                ) : null}
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <h2
                            id="run-detail-title"
                            className="text-fg truncate font-mono text-xl font-bold"
                        >
                            {route ? runPath(route.url) : t(`history.types.${run.type}`)}
                        </h2>
                        <Badge variant="accent-soft">{t(`history.types.${run.type}`)}</Badge>
                        <Badge
                            variant="outline"
                            className={cn('font-sans font-semibold', STATUS_TEXT[run.status])}
                        >
                            {t(`runStatus.${run.status}`)}
                        </Badge>
                    </div>
                    <p className="text-fg-muted font-mono text-sm">
                        {[
                            route ? runHost(route.url) : null,
                            formatRunDateTime(run.createdAt, i18n.language),
                            t('history.runId', { id: shortRunId(run.id) }),
                        ]
                            .filter(Boolean)
                            .join(' · ')}
                    </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                    <Button
                        variant="secondary"
                        onClick={() => download(run)}
                    >
                        <Download
                            aria-hidden
                            className="size-3.5"
                        />
                        {t('history.export')}
                    </Button>
                    {single ? (
                        <Button
                            variant="primary"
                            disabled={rerun.isPending}
                            onClick={() => rerun.mutate(run.id)}
                        >
                            <RotateCcw
                                aria-hidden
                                className="size-3.5"
                            />
                            {rerun.isPending ? t('history.rerunning') : t('history.rerun')}
                        </Button>
                    ) : null}
                </div>
            </header>

            {run.status === 'FAILED' ? (
                <RunFailure reason={run.reason ?? t('runOutcome.noReason')} />
            ) : null}

            {summary ? (
                <StatList className="grid-cols-5">
                    <StatCard
                        label={t('history.stats.avgRps')}
                        value={format(summary.avgRps, 1)}
                        badge={
                            previous ? (
                                <Delta
                                    value={percentChange(summary.avgRps, previous.avgRps)}
                                    label={`${format(Math.abs(percentChange(summary.avgRps, previous.avgRps) ?? 0), 1)}%`}
                                    better="up"
                                />
                            ) : null
                        }
                    />
                    {(['p50Ms', 'p95Ms', 'p99Ms'] as const).map((key) => (
                        <StatCard
                            key={key}
                            label={key.replace('Ms', '')}
                            value={latency ? format(latency[key]) : '—'}
                            unit={latency ? t('liveMetrics.units.ms') : undefined}
                            badge={
                                latency && before ? (
                                    <Delta
                                        value={latency[key] - before[key]}
                                        label={t('history.ms', {
                                            value: format(Math.abs(latency[key] - before[key])),
                                        })}
                                        better="down"
                                    />
                                ) : null
                            }
                        />
                    ))}
                    <StatCard
                        label={t('history.stats.errors')}
                        value={format(summary.totals.errorRate * 100, 1)}
                        unit="%"
                        tone={summary.totals.errors > 0 ? 'danger' : 'default'}
                        badge={
                            previous ? (
                                <Delta
                                    value={
                                        (summary.totals.errorRate - previous.totals.errorRate) * 100
                                    }
                                    label={t('history.pp', {
                                        value: format(
                                            Math.abs(
                                                (summary.totals.errorRate -
                                                    previous.totals.errorRate) *
                                                    100,
                                            ),
                                            1,
                                        ),
                                    })}
                                    better="down"
                                />
                            ) : null
                        }
                    />
                </StatList>
            ) : null}

            {summary ? (
                <div className="grid grid-cols-2 items-start gap-3">
                    <Card className="flex flex-col gap-3">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <CardTitle className="text-md font-bold">
                                    {t('history.percentiles.title')}
                                </CardTitle>
                                <p className="text-fg-muted text-sm">
                                    {before
                                        ? t('history.percentiles.vsPrevious')
                                        : t('history.percentiles.noPrevious')}
                                </p>
                            </div>
                        </div>
                        {percentRow('p50Ms', 'p50')}
                        {percentRow('p95Ms', 'p95')}
                        {percentRow('p99Ms', 'p99')}
                    </Card>
                    <StatusCodesCard
                        codes={summary.totals.codes}
                        networkErrors={summary.totals.networkErrors}
                    />
                </div>
            ) : null}

            <div className="grid grid-cols-2 items-start gap-3">
                {single ? (
                    <Card className="flex flex-col gap-3">
                        <CardTitle className="text-md font-bold">
                            {t('history.config.title')}
                        </CardTitle>
                        <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                            <Field label={t('history.config.targetRps')}>
                                {format(single.targetRps)}
                            </Field>
                            <Field label={t('history.config.duration')}>
                                {t('history.seconds', { value: single.durationSeconds })}
                            </Field>
                            <Field label={t('history.config.rampUp')}>
                                {t('history.seconds', { value: single.rampUpSeconds ?? 0 })}
                            </Field>
                            <Field label={t('history.config.requestsSent')}>
                                {summary ? format(summary.totals.requests) : '—'}
                            </Field>
                            <Field label={t('history.config.baseUrl')}>
                                {runOrigin(single.target.url)}
                            </Field>
                            <Field label={t('history.config.auth')}>
                                {t(`history.config.${authKind(single.target.headers)}`)}
                            </Field>
                        </dl>
                        {single.target.body ? (
                            <div className="flex flex-col gap-1">
                                <span className="text-fg-muted text-sm">
                                    {t('history.config.body')}
                                </span>
                                <pre className="bg-surface-code border-track text-fg-secondary rounded-editor max-h-72 overflow-auto border p-3 font-mono text-sm">
                                    {single.target.body}
                                </pre>
                            </div>
                        ) : null}
                    </Card>
                ) : null}
                {sameRoute.length > 0 ? (
                    <Card className="flex flex-col gap-2">
                        <div>
                            <CardTitle className="text-md font-bold">
                                {t('history.routeRuns.title')}
                            </CardTitle>
                            <p className="text-fg-muted font-mono text-sm">
                                {route
                                    ? t('history.routeRuns.subtitle', {
                                          route: `${route.method} ${runPath(route.url)}`,
                                          count: sameRoute.length,
                                      })
                                    : null}
                            </p>
                        </div>
                        <table className="text-label w-full tabular-nums">
                            <thead>
                                <tr className="text-fg-muted text-left text-xs uppercase">
                                    <th
                                        scope="col"
                                        className="py-1 font-semibold"
                                    >
                                        {t('history.routeRuns.date')}
                                    </th>
                                    <th
                                        scope="col"
                                        className="py-1 text-right font-semibold"
                                    >
                                        {t('history.routeRuns.rps')}
                                    </th>
                                    <th
                                        scope="col"
                                        className="py-1 text-right font-semibold"
                                    >
                                        {t('history.routeRuns.p95')}
                                    </th>
                                    <th
                                        scope="col"
                                        className="py-1 text-right font-semibold"
                                    >
                                        {t('history.routeRuns.errors')}
                                    </th>
                                    <th
                                        scope="col"
                                        className="w-28 py-1 pl-6 font-semibold"
                                    >
                                        {t('history.routeRuns.trend')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {sameRoute.map((item) => {
                                    const itemSummary = summaries.get(item.id) ?? null;
                                    const current = item.id === run.id;
                                    const errorRate = itemSummary?.totals.errorRate ?? 0;
                                    return (
                                        <tr
                                            key={item.id}
                                            aria-current={current ? 'true' : undefined}
                                            className={cn(
                                                'border-border border-t',
                                                current && 'bg-surface-raised',
                                            )}
                                        >
                                            <th
                                                scope="row"
                                                className={cn(
                                                    'py-1.5 text-left font-mono font-normal',
                                                    current ? 'text-accent' : 'text-fg-secondary',
                                                )}
                                            >
                                                {formatRunDateTime(item.createdAt, i18n.language)}
                                                {current ? ` · ${t('history.routeRuns.this')}` : ''}
                                            </th>
                                            <td className="text-fg py-1.5 text-right font-mono">
                                                {itemSummary
                                                    ? format(itemSummary.avgRps)
                                                    : format(item.targetRps ?? 0)}
                                            </td>
                                            <td className="text-fg py-1.5 text-right font-mono font-bold">
                                                {item.p95Ms === undefined ? '—' : ms(item.p95Ms)}
                                            </td>
                                            <td
                                                className={cn(
                                                    'py-1.5 text-right font-mono',
                                                    errorRate > HIGH_ERROR_RATE
                                                        ? 'text-danger'
                                                        : 'text-fg-muted',
                                                )}
                                            >
                                                {itemSummary
                                                    ? `${format(itemSummary.totals.errorRate * 100, 1)}%`
                                                    : '—'}
                                            </td>
                                            <td className="py-1.5 pl-6">
                                                {item.p95Ms === undefined ? null : (
                                                    <div
                                                        aria-hidden
                                                        className="bg-surface-2 h-1.5 w-full overflow-hidden rounded-full"
                                                    >
                                                        <div
                                                            className={cn(
                                                                'h-full rounded-full',
                                                                current && 'bg-accent',
                                                                !current &&
                                                                    errorRate > HIGH_ERROR_RATE &&
                                                                    'bg-danger',
                                                                !current &&
                                                                    errorRate <= HIGH_ERROR_RATE &&
                                                                    'bg-fg-faint',
                                                            )}
                                                            style={{
                                                                width: `${trendWidth(item.p95Ms, maxP95)}%`,
                                                            }}
                                                        />
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        <p className="text-fg-muted mt-auto pt-4 text-xs">
                            {t('history.routeRuns.note')}{' '}
                            {chartsReplayable(run) ? (
                                <Link
                                    to="/tests"
                                    search={{ ...placeSearch(placeOfRun(run.id)), run: run.id }}
                                    className="text-accent focus-visible:ring-accent/40 rounded-sm font-semibold underline-offset-2 outline-none hover:underline focus-visible:ring-2"
                                >
                                    {t('history.routeRuns.openCharts')}
                                </Link>
                            ) : null}
                        </p>
                    </Card>
                ) : null}
            </div>
        </article>
    );
}
