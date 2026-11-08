import { useTranslation } from 'react-i18next';

import type { Percentiles, RunningTotals } from '@/api/live';
import { StatCard, StatList } from '@/components/shared/stat-card';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';

import { LateBadge } from './late-badge';

const EMPTY = '—';

export interface LiveStatsProps {
    rps: number | null;
    latency: Percentiles | null;
    totals: Pick<RunningTotals, 'requests' | 'errors' | 'errorRate'> &
        Partial<Pick<RunningTotals, 'late'>>;
    targetRps: number | null;
    scope?: 'second' | 'run';
    className?: string;
}

export function LiveStats({
    rps,
    latency,
    totals,
    targetRps,
    scope = 'second',
    className,
}: LiveStatsProps) {
    const { t, i18n } = useTranslation();
    const format = (value: number, digits = 0) => formatNumber(value, digits, i18n.language);
    const ms = t('liveMetrics.units.ms');
    const whole = scope === 'run';
    const rpsLabel =
        targetRps === null
            ? t(whole ? 'liveMetrics.stats.avgRps' : 'liveMetrics.stats.rps')
            : t(whole ? 'liveMetrics.stats.avgRpsTarget' : 'liveMetrics.stats.rpsTarget', {
                  target: format(targetRps),
              });

    return (
        <StatList
            aria-label={t(whole ? 'liveMetrics.stats.runLabel' : 'liveMetrics.stats.label')}
            className={cn('grid-cols-4', className)}
        >
            <StatCard
                label={rpsLabel}
                value={rps === null ? EMPTY : format(rps, 1)}
                badge={
                    totals.late ? (
                        <LateBadge
                            late={totals.late}
                            requests={totals.requests}
                        />
                    ) : null
                }
            />
            <StatCard
                label={t(whole ? 'liveMetrics.stats.p50Run' : 'liveMetrics.stats.p50')}
                value={latency ? format(latency.p50Ms) : EMPTY}
                unit={latency ? ms : undefined}
            />
            <StatCard
                label={t(whole ? 'liveMetrics.stats.p95Run' : 'liveMetrics.stats.p95')}
                value={latency ? format(latency.p95Ms) : EMPTY}
                unit={latency ? ms : undefined}
            />
            <StatCard
                label={
                    totals.requests > 0
                        ? t('liveMetrics.stats.errors', {
                              errors: format(totals.errors),
                              requests: format(totals.requests),
                          })
                        : t('liveMetrics.stats.errorsEmpty')
                }
                value={totals.requests > 0 ? format(totals.errorRate * 100, 1) : EMPTY}
                unit={totals.requests > 0 ? '%' : undefined}
                tone={totals.errors > 0 ? 'danger' : 'default'}
            />
        </StatList>
    );
}
