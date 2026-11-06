import { useTranslation } from 'react-i18next';

import { type LiveTest, snapshotLatency } from '@/api/live';
import { StatCard, StatList } from '@/components/shared/stat-card';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';

const EMPTY = '—';

export interface LiveStatsProps {
    live: Pick<LiveTest, 'latest' | 'totals'>;
    targetRps: number | null;
    className?: string;
}

export function LiveStats({ live, targetRps, className }: LiveStatsProps) {
    const { t, i18n } = useTranslation();
    const format = (value: number, digits = 0) => formatNumber(value, digits, i18n.language);
    const { latest, totals } = live;
    const latency = latest ? snapshotLatency(latest) : null;
    const ms = t('liveMetrics.units.ms');

    return (
        <StatList
            aria-label={t('liveMetrics.stats.label')}
            className={cn('grid-cols-4', className)}
        >
            <StatCard
                label={
                    targetRps === null
                        ? t('liveMetrics.stats.rps')
                        : t('liveMetrics.stats.rpsTarget', { target: format(targetRps) })
                }
                value={latest ? format(latest.actualRps, 1) : EMPTY}
            />
            <StatCard
                label={t('liveMetrics.stats.p50')}
                value={latency ? format(latency.p50Ms) : EMPTY}
                unit={latency ? ms : undefined}
            />
            <StatCard
                label={t('liveMetrics.stats.p95')}
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
