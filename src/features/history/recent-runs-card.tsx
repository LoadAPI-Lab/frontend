import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';

import { getTestRunsListQueryOptions } from '@/api/generated/endpoints/test-runs/test-runs';
import { ErrorState } from '@/components/shared/error-state';
import { MethodBadge } from '@/components/shared/method-badge';
import { Card, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';

import type { RunListItem } from './history-api';
import { formatRelativeTime, runPath } from './history-format';
import { STATUS_TEXT } from './run-status';

export const RECENT_RUNS = 4;

function RecentRun({ run }: { run: RunListItem }) {
    const { t, i18n } = useTranslation();
    const format = (value: number) => formatNumber(value, 0, i18n.language);
    const single = run.type === 'single';
    const title = single && run.request ? runPath(run.request.url) : t(`history.types.${run.type}`);
    const meta = single
        ? t('history.row.single', {
              rps: format(run.targetRps ?? 0),
              duration: format(run.durationSeconds ?? 0),
              time: formatRelativeTime(run.createdAt, i18n.language),
          })
        : t('history.row.scenario', {
              count: run.stepsCount ?? 0,
              time: formatRelativeTime(run.createdAt, i18n.language),
          });
    const finished = run.status === 'COMPLETED' || run.status === 'STOPPED';

    return (
        <li>
            <Link
                to="/history"
                search={{ run: run.id }}
                className="hover:bg-surface-input focus-visible:ring-accent/40 flex items-center gap-3 rounded-lg px-2 py-2 outline-none focus-visible:ring-2"
            >
                {single && run.request ? (
                    <MethodBadge
                        method={run.request.method}
                        size="md"
                        className="w-12 shrink-0"
                    />
                ) : (
                    <span className="bg-surface-2 text-fg-muted flex h-6 w-12 shrink-0 items-center justify-center rounded-md font-mono text-xs font-semibold">
                        {t(`history.typeShort.${run.type}`)}
                    </span>
                )}
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-fg truncate font-mono text-sm">{title}</span>
                    <span className="text-fg-muted truncate text-xs">{meta}</span>
                </span>
                {finished && run.p95Ms !== undefined ? (
                    <span className="bg-accent text-accent-fg shrink-0 rounded-md px-2 py-1 font-mono text-xs font-bold tabular-nums">
                        {t('history.recent.p95', { value: format(run.p95Ms) })}
                    </span>
                ) : (
                    <span
                        className={cn(
                            'shrink-0 text-xs font-semibold uppercase',
                            STATUS_TEXT[run.status],
                        )}
                    >
                        {t(`runStatus.${run.status}`)}
                    </span>
                )}
            </Link>
        </li>
    );
}

export function RecentRunsCard({ className }: { className?: string }) {
    const { t } = useTranslation();
    const titleId = useId();
    const runs = useQuery(getTestRunsListQueryOptions({ limit: RECENT_RUNS }));

    let body;
    if (runs.isPending) {
        body = (
            <div
                aria-label={t('history.recent.loading')}
                className="flex flex-col gap-2"
            >
                {Array.from({ length: RECENT_RUNS }, (_, index) => (
                    <Skeleton
                        key={index}
                        className="h-10 w-full"
                    />
                ))}
            </div>
        );
    } else if (runs.isError) {
        body = (
            <ErrorState
                size="compact"
                message={runs.error.message}
                onRetry={() => void runs.refetch()}
                retrying={runs.isRefetching}
            />
        );
    } else if (runs.data.items.length === 0) {
        body = <p className="text-fg-muted px-2 text-sm">{t('history.recent.empty')}</p>;
    } else {
        body = (
            <ul className="flex flex-col">
                {runs.data.items.map((run) => (
                    <RecentRun
                        key={run.id}
                        run={run}
                    />
                ))}
            </ul>
        );
    }

    return (
        <Card
            aria-labelledby={titleId}
            className={cn('flex flex-col gap-2', className)}
        >
            <div className="flex items-center justify-between gap-2 px-2">
                <CardTitle
                    id={titleId}
                    className="text-md font-bold"
                >
                    {t('history.recent.title')}
                </CardTitle>
                <Link
                    to="/history"
                    className="text-accent focus-visible:ring-accent/40 flex items-center gap-1 rounded-sm text-sm font-semibold outline-none hover:underline focus-visible:ring-2"
                >
                    {t('history.recent.viewAll')}
                    <ArrowRight
                        aria-hidden
                        className="size-3.5"
                    />
                </Link>
            </div>
            {body}
        </Card>
    );
}
