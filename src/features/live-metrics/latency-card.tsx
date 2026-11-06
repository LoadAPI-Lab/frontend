import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { latencySeries, type Snapshot, snapshotLatency } from '@/api/live';
import { Card, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';

import { LATENCY_LINES, LatencyPlot } from './latency-plot';

const MIN_WINDOW_SECONDS = 10;

export interface LatencyCardProps {
    snapshots: readonly Snapshot[];
    durationSeconds: number | null;
    emptyMessage: string;
    className?: string;
}

export function LatencyCard({
    snapshots,
    durationSeconds,
    emptyMessage,
    className,
}: LatencyCardProps) {
    const { t, i18n } = useTranslation();
    const data = useMemo(() => latencySeries(snapshots), [snapshots]);
    const last = snapshots.at(-1);
    const latency = last ? snapshotLatency(last) : null;
    const windowSeconds = Math.max(
        durationSeconds ?? 0,
        last?.elapsedSeconds ?? 0,
        MIN_WINDOW_SECONDS,
    );
    const ms = (value: number) => formatNumber(value, 0, i18n.language);
    const label = latency
        ? t('liveMetrics.latency.summary', {
              p50: ms(latency.p50Ms),
              p95: ms(latency.p95Ms),
              p99: ms(latency.p99Ms),
          })
        : emptyMessage;

    return (
        <Card className={cn('flex flex-col gap-2 px-4 py-3.5', className)}>
            <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-0.5">
                    <CardTitle className="text-md font-bold">
                        {t('liveMetrics.latency.title')}
                    </CardTitle>
                    <p className="text-fg-muted text-sm">{t('liveMetrics.latency.subtitle')}</p>
                </div>
                <ul
                    aria-label={t('liveMetrics.latency.legend')}
                    className="flex gap-2.5"
                >
                    {LATENCY_LINES.map((line) => (
                        <li
                            key={line.key}
                            className="text-fg-muted flex items-center gap-1.25 text-sm"
                        >
                            <span
                                aria-hidden
                                className={cn('h-0.5 w-2', line.swatch)}
                            />
                            {t(`liveMetrics.latency.lines.${line.key}`)}
                        </li>
                    ))}
                </ul>
            </div>
            <div className="relative">
                <LatencyPlot
                    data={data}
                    windowSeconds={windowSeconds}
                    label={label}
                />
                {snapshots.length === 0 ? (
                    <p
                        aria-hidden
                        className="text-fg-muted absolute inset-0 flex items-center justify-center px-6 pb-6 text-center text-sm"
                    >
                        {emptyMessage}
                    </p>
                ) : null}
            </div>
        </Card>
    );
}
