import { useId, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
    errorSeries,
    latencySeries,
    runningTotals,
    serviceTimeSeries,
    type Snapshot,
    snapshotLatency,
    throughputSeries,
} from '@/api/live';
import { Card, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';

import { LivePlot, type PlotData, type PlotSeries, type ZoomRange } from './live-plot';

const MIN_WINDOW_SECONDS = 10;
const PLOT_HEIGHT = 116;

export const CHART_KINDS = ['latency', 'throughput', 'errors'] as const;

export type ChartKind = (typeof CHART_KINDS)[number];

interface ChartConfig {
    series: PlotSeries[];
    data: PlotData;
    values?: number[][];
    shares?: string[];
    bars: boolean;
    yFloor: number;
    formatValue: (value: number) => string;
    summary: string | null;
}

function stack(columns: readonly number[][]): number[][] {
    return columns.map((_, depth) =>
        (columns[0] ?? []).map((_value, index) =>
            columns.slice(0, depth + 1).reduce((sum, column) => sum + (column[index] ?? 0), 0),
        ),
    );
}

export interface LiveChartCardProps {
    kind: ChartKind;
    snapshots: readonly Snapshot[];
    durationSeconds: number | null;
    emptyMessage: string;
    zoom?: ZoomRange | null;
    onZoom?: (zoom: ZoomRange | null) => void;
    className?: string;
}

export function LiveChartCard({
    kind,
    snapshots,
    durationSeconds,
    emptyMessage,
    zoom,
    onZoom,
    className,
}: LiveChartCardProps) {
    const { t, i18n } = useTranslation();
    const [serviceTime, setServiceTime] = useState(false);
    const [ownZoom, setOwnZoom] = useState<ZoomRange | null>(null);
    const titleId = useId();
    const last = snapshots.at(-1);
    const windowSeconds = Math.max(
        durationSeconds ?? 0,
        last?.elapsedSeconds ?? 0,
        MIN_WINDOW_SECONDS,
    );

    const chart = useMemo((): ChartConfig => {
        const format = (value: number) => formatNumber(value, 0, i18n.language);
        if (kind === 'throughput') {
            const [elapsed, actual, target] = throughputSeries(snapshots);
            return {
                series: [
                    {
                        key: 'actual',
                        label: t('liveMetrics.throughput.actual'),
                        token: '--color-accent',
                        swatch: 'bg-accent',
                        width: 1.5,
                        fill: true,
                    },
                    {
                        key: 'target',
                        label: t('liveMetrics.throughput.target'),
                        token: '--color-fg-muted',
                        swatch: 'bg-fg-muted',
                        dash: [5, 4],
                    },
                ],
                data: [elapsed, actual, target],
                bars: false,
                yFloor: 10,
                formatValue: (value) => t('liveMetrics.units.rpsValue', { value: format(value) }),
                summary: last
                    ? t('liveMetrics.throughput.summary', {
                          actual: format(last.actualRps),
                          target: format(last.targetRps),
                      })
                    : null,
            };
        }
        if (kind === 'errors') {
            const [elapsed, clientErrors, serverErrors, network] = errorSeries(snapshots);
            const raw = [clientErrors, serverErrors, network];
            const { statuses } = runningTotals(snapshots);
            const responses = Object.values(statuses).reduce((sum, count) => sum + count, 0);
            const share = (count: number) =>
                responses > 0
                    ? `${formatNumber((count / responses) * 100, 1, i18n.language)}%`
                    : '—';
            return {
                series: [
                    {
                        key: '4xx',
                        label: t('liveMetrics.statusCodes.groups.4xx'),
                        token: '--color-info',
                        swatch: 'bg-info',
                    },
                    {
                        key: '5xx',
                        label: t('liveMetrics.statusCodes.groups.5xx'),
                        token: '--color-danger',
                        swatch: 'bg-danger',
                    },
                    {
                        key: 'network',
                        label: t('liveMetrics.statusCodes.groups.network'),
                        token: '--color-warning',
                        swatch: 'bg-warning',
                    },
                ],
                data: [elapsed, ...stack(raw)],
                values: raw,
                shares: [share(statuses['4xx']), share(statuses['5xx']), share(statuses.network)],
                bars: true,
                yFloor: 5,
                formatValue: format,
                summary:
                    elapsed.length > 0
                        ? t('liveMetrics.errorsChart.summary', {
                              clientErrors: format(clientErrors.at(-1) ?? 0),
                              serverErrors: format(serverErrors.at(-1) ?? 0),
                              network: format(network.at(-1) ?? 0),
                          })
                        : null,
            };
        }
        const [elapsed, p50, p95, p99] = latencySeries(snapshots);
        const latency = last ? snapshotLatency(last) : null;
        const lines: PlotSeries[] = [
            {
                key: 'p50',
                label: t('liveMetrics.latency.lines.p50'),
                token: '--color-fg-muted',
                swatch: 'bg-fg-muted',
            },
            {
                key: 'p95',
                label: t('liveMetrics.latency.lines.p95'),
                token: '--color-info',
                swatch: 'bg-info',
            },
            {
                key: 'p99',
                label: t('liveMetrics.latency.lines.p99'),
                token: '--color-accent',
                swatch: 'bg-accent',
                width: 1.5,
                fill: true,
            },
        ];
        const ms = (value: number) => t('liveMetrics.units.msValue', { value: format(value) });
        const summary = latency
            ? t('liveMetrics.latency.summary', {
                  p50: format(latency.p50Ms),
                  p95: format(latency.p95Ms),
                  p99: format(latency.p99Ms),
              })
            : null;
        if (!serviceTime) {
            return {
                series: lines,
                data: [elapsed, p50, p95, p99],
                bars: false,
                yFloor: 10,
                formatValue: ms,
                summary,
            };
        }
        const [service95, service99] = serviceTimeSeries(snapshots);
        return {
            series: [
                ...lines,
                {
                    key: 'service95',
                    label: t('liveMetrics.latency.lines.service95'),
                    token: '--color-info',
                    swatch: 'bg-info/50',
                    width: 1,
                    dash: [4, 3],
                },
                {
                    key: 'service99',
                    label: t('liveMetrics.latency.lines.service99'),
                    token: '--color-accent',
                    swatch: 'bg-accent/50',
                    width: 1,
                    dash: [4, 3],
                },
            ],
            data: [elapsed, p50, p95, p99, service95, service99],
            bars: false,
            yFloor: 10,
            formatValue: ms,
            summary,
        };
    }, [kind, serviceTime, snapshots, last, t, i18n.language]);

    const title = t(`liveMetrics.charts.tabs.${kind}`);
    const activeZoom = zoom === undefined ? ownZoom : zoom;
    const changeZoom = onZoom ?? setOwnZoom;
    const subtitle = t(`liveMetrics.charts.subtitles.${kind}`);

    return (
        <Card
            aria-labelledby={titleId}
            className={cn('flex flex-col gap-2 px-4 py-3', className)}
        >
            <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-0.5">
                    <CardTitle
                        id={titleId}
                        className="text-md font-bold"
                    >
                        {title}
                    </CardTitle>
                    <p className="text-fg-muted text-sm">
                        {activeZoom
                            ? t('liveMetrics.charts.zoomedSubtitle', {
                                  subtitle,
                                  from: Math.max(1, Math.ceil(activeZoom[0])),
                                  to: Math.floor(activeZoom[1]),
                              })
                            : t('liveMetrics.charts.zoomSubtitle', { subtitle })}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {activeZoom ? (
                        <button
                            type="button"
                            onClick={() => changeZoom(null)}
                            className="border-border-strong text-fg hover:bg-surface-2 focus-visible:ring-accent/40 shrink-0 rounded-md border px-2 py-0.5 text-sm transition-colors outline-none focus-visible:ring-2"
                        >
                            {t('liveMetrics.charts.resetZoom')}
                        </button>
                    ) : null}
                    <ul
                        aria-label={t('liveMetrics.charts.legend', { chart: title })}
                        className="flex flex-wrap justify-end gap-x-2.5 gap-y-1"
                    >
                        {chart.series.map((line, index) => (
                            <li
                                key={line.key}
                                className="text-fg-muted flex items-center gap-1.25 text-sm"
                            >
                                <span
                                    aria-hidden
                                    className={cn(
                                        chart.bars ? 'size-1.75 rounded-xs' : 'h-0.5 w-2',
                                        line.swatch,
                                    )}
                                />
                                {line.label}
                                {chart.shares ? (
                                    <span className="text-fg font-mono font-bold tabular-nums">
                                        {chart.shares[index]}
                                    </span>
                                ) : null}
                            </li>
                        ))}
                    </ul>
                    {kind === 'latency' ? (
                        <button
                            type="button"
                            aria-pressed={serviceTime}
                            onClick={() => setServiceTime(!serviceTime)}
                            className="border-border-strong text-fg-muted hover:text-fg aria-pressed:bg-surface-2 aria-pressed:text-fg focus-visible:ring-accent/40 shrink-0 rounded-md border px-2 py-0.5 text-sm transition-colors outline-none focus-visible:ring-2"
                        >
                            {t('liveMetrics.latency.serviceTime')}
                        </button>
                    ) : null}
                </div>
            </div>
            <div className="relative">
                <LivePlot
                    key={String(serviceTime)}
                    series={chart.series}
                    data={chart.data}
                    values={chart.values}
                    bars={chart.bars}
                    yFloor={chart.yFloor}
                    height={PLOT_HEIGHT}
                    zoom={activeZoom}
                    onZoom={changeZoom}
                    formatTick={(value) => formatNumber(value, 0, i18n.language)}
                    windowSeconds={windowSeconds}
                    formatValue={chart.formatValue}
                    label={chart.summary ?? emptyMessage}
                    browseLabel={t('liveMetrics.charts.browse', { chart: title })}
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

export interface LiveChartsProps {
    snapshots: readonly Snapshot[];
    durationSeconds: number | null;
    emptyMessage: string;
    className?: string;
}

export function LiveCharts({
    snapshots,
    durationSeconds,
    emptyMessage,
    className,
}: LiveChartsProps) {
    const { t } = useTranslation();
    const [zoom, setZoom] = useState<ZoomRange | null>(null);
    const shownZoom = snapshots.length > 0 ? zoom : null;

    return (
        <div className={cn('flex flex-col gap-3', className)}>
            {CHART_KINDS.map((kind) => (
                <LiveChartCard
                    key={kind}
                    kind={kind}
                    snapshots={snapshots}
                    durationSeconds={durationSeconds}
                    emptyMessage={
                        kind === 'latency' ? emptyMessage : t('liveMetrics.charts.noData')
                    }
                    zoom={shownZoom}
                    onZoom={setZoom}
                />
            ))}
        </div>
    );
}
