import { ChevronRight, Maximize, Maximize2, Minimize2, X } from 'lucide-react';
import { type RefObject, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
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
import { Sparkline } from '@/components/shared/sparkline';
import { Card, CardTitle } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { IconButton } from '@/components/ui/icon-button';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';

import { LivePlot, type PlotData, type PlotSeries, type ZoomRange } from './live-plot';

const MIN_WINDOW_SECONDS = 10;

export const chartWindowSeconds = (durationSeconds: number | null, lastSecond: number) =>
    durationSeconds && durationSeconds > 0
        ? Math.max(durationSeconds, lastSecond)
        : Math.max(lastSecond, MIN_WINDOW_SECONDS);
const PLOT_HEIGHT = 116;

const SPARK_COLUMN: Record<ChartKind, number> = { latency: 2, throughput: 1, errors: 3 };
const latestOf = (column: readonly (number | null)[] | undefined) =>
    column?.findLast((value) => typeof value === 'number') ?? null;

const SPARK_COLOR: Record<ChartKind, string> = {
    latency: 'text-info',
    throughput: 'text-accent',
    errors: 'text-danger',
};

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
    collapsed?: boolean;
    onCollapsedChange?: (collapsed: boolean) => void;
    variant?: 'card' | 'large';
    className?: string;
}

export function LiveChartCard({
    kind,
    snapshots,
    durationSeconds,
    emptyMessage,
    zoom,
    onZoom,
    collapsed,
    onCollapsedChange,
    variant = 'card',
    className,
}: LiveChartCardProps) {
    const { t, i18n } = useTranslation();
    const [serviceTime, setServiceTime] = useState(false);
    const [ownZoom, setOwnZoom] = useState<ZoomRange | null>(null);
    const [ownCollapsed, setOwnCollapsed] = useState(false);
    const [enlarged, setEnlarged] = useState(false);
    const [reopened, setReopened] = useState(false);
    const sectionRef = useRef<HTMLElement>(null);
    const titleId = useId();
    const plotId = useId();
    const isCollapsed = collapsed ?? ownCollapsed;
    const changeCollapsed = onCollapsedChange ?? setOwnCollapsed;
    const last = snapshots.at(-1);
    const windowSeconds = chartWindowSeconds(durationSeconds, last?.elapsedSeconds ?? 0);

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
    const latestMain = latestOf(chart.data[SPARK_COLUMN[kind]]);
    const format = (value: number) => formatNumber(value, 0, i18n.language);
    let compactValue = '—';
    if (latestMain !== null && kind === 'latency') {
        compactValue = t('liveMetrics.charts.compact.latency', { value: format(latestMain) });
    } else if (latestMain !== null && kind === 'throughput') {
        compactValue = t('liveMetrics.charts.compact.throughput', {
            value: format(latestMain),
            target: format(last?.targetRps ?? 0),
        });
    } else if (latestMain !== null) {
        compactValue = t('liveMetrics.charts.compact.errors', { value: format(latestMain) });
    }

    const large = variant === 'large';
    const showPlot = large || !isCollapsed;
    let subtitleText = t('liveMetrics.charts.zoomSubtitle', { subtitle });
    if (!showPlot) {
        subtitleText = subtitle;
    } else if (activeZoom) {
        subtitleText = t('liveMetrics.charts.zoomedSubtitle', {
            subtitle,
            from: Math.max(1, Math.ceil(activeZoom[0])),
            to: Math.floor(activeZoom[1]),
        });
    }

    const header = (
        <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-0.5">
                {large ? (
                    <Dialog.Title
                        id={titleId}
                        className="text-lg font-bold"
                    >
                        {title}
                    </Dialog.Title>
                ) : (
                    <CardTitle
                        id={titleId}
                        className="text-md font-bold"
                    >
                        <button
                            type="button"
                            aria-expanded={!isCollapsed}
                            aria-controls={plotId}
                            onClick={() => {
                                setReopened(isCollapsed);
                                changeCollapsed(!isCollapsed);
                            }}
                            className="hover:text-fg focus-visible:ring-accent/40 -ml-1 flex items-center gap-1.5 rounded-sm px-1 outline-none focus-visible:ring-2"
                        >
                            <ChevronRight
                                aria-hidden
                                className={cn(
                                    'text-fg-muted size-3.5 shrink-0 transition-transform duration-150 motion-reduce:transition-none',
                                    !isCollapsed && 'rotate-90',
                                )}
                            />
                            {title}
                        </button>
                    </CardTitle>
                )}
                <p className="text-fg-muted text-sm">{subtitleText}</p>
            </div>
            <div className="flex items-center gap-3">
                {activeZoom && showPlot ? (
                    <button
                        type="button"
                        onClick={() => changeZoom(null)}
                        className="border-border-strong text-fg hover:bg-surface-2 focus-visible:ring-accent/40 shrink-0 rounded-md border px-2 py-0.5 text-sm transition-colors outline-none focus-visible:ring-2"
                    >
                        {t('liveMetrics.charts.resetZoom')}
                    </button>
                ) : null}
                {showPlot ? (
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
                ) : (
                    <p className="flex items-center gap-2.5">
                        <Sparkline
                            values={chart.data[SPARK_COLUMN[kind]] ?? []}
                            className={SPARK_COLOR[kind]}
                        />
                        <span className="text-fg font-mono text-sm font-bold tabular-nums">
                            {compactValue}
                        </span>
                    </p>
                )}
                {kind === 'latency' && showPlot ? (
                    <button
                        type="button"
                        aria-pressed={serviceTime}
                        onClick={() => setServiceTime(!serviceTime)}
                        className="border-border-strong text-fg-muted hover:text-fg aria-pressed:bg-surface-2 aria-pressed:text-fg focus-visible:ring-accent/40 shrink-0 rounded-md border px-2 py-0.5 text-sm transition-colors outline-none focus-visible:ring-2"
                    >
                        {t('liveMetrics.latency.serviceTime')}
                    </button>
                ) : null}
                {large ? (
                    <>
                        <FullscreenToggle target={sectionRef} />
                        <Dialog.Close
                            render={
                                <IconButton
                                    variant="ghost"
                                    size="md"
                                    aria-label={t('liveMetrics.charts.close')}
                                />
                            }
                        >
                            <X aria-hidden />
                        </Dialog.Close>
                    </>
                ) : null}
                {!large && showPlot ? (
                    <IconButton
                        variant="ghost"
                        aria-label={t('liveMetrics.charts.enlarge', { chart: title })}
                        onClick={() => setEnlarged(true)}
                    >
                        <Maximize2 aria-hidden />
                    </IconButton>
                ) : null}
            </div>
        </div>
    );

    const plot = showPlot ? (
        <div
            id={plotId}
            className={cn(
                'relative',
                reopened && 'motion-safe:animate-tree-in',
                large && 'min-h-0 flex-1',
            )}
        >
            <LivePlot
                key={String(serviceTime)}
                series={chart.series}
                data={chart.data}
                values={chart.values}
                bars={chart.bars}
                yFloor={chart.yFloor}
                height={PLOT_HEIGHT}
                fill={large}
                className={large ? 'h-full' : undefined}
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
    ) : null;

    if (large) {
        return (
            <section
                ref={sectionRef}
                aria-labelledby={titleId}
                className={cn(
                    'flex h-full min-h-0 flex-col gap-3 [&:fullscreen]:bg-surface-1 [&:fullscreen]:p-8',
                    className,
                )}
            >
                {header}
                {plot}
            </section>
        );
    }

    return (
        <>
            <Card
                aria-labelledby={titleId}
                className={cn('flex flex-col gap-2 px-4 py-3', className)}
            >
                {header}
                {plot}
            </Card>
            <Dialog.Root
                open={enlarged}
                onOpenChange={setEnlarged}
            >
                <Dialog.Popup className="h-[80dvh] max-h-none w-[90vw] max-w-[1600px]">
                    {enlarged ? (
                        <LiveChartCard
                            kind={kind}
                            snapshots={snapshots}
                            durationSeconds={durationSeconds}
                            emptyMessage={emptyMessage}
                            zoom={activeZoom}
                            onZoom={changeZoom}
                            variant="large"
                        />
                    ) : null}
                </Dialog.Popup>
            </Dialog.Root>
        </>
    );
}

function FullscreenToggle({ target }: { target: RefObject<HTMLElement | null> }) {
    const { t } = useTranslation();
    const [active, setActive] = useState(false);

    useEffect(() => {
        const onChange = () => setActive(document.fullscreenElement === target.current);
        document.addEventListener('fullscreenchange', onChange);
        return () => document.removeEventListener('fullscreenchange', onChange);
    }, [target]);

    if (!document.fullscreenEnabled) {
        return null;
    }
    return (
        <IconButton
            variant="ghost"
            size="md"
            aria-label={t(
                active ? 'liveMetrics.charts.exitFullscreen' : 'liveMetrics.charts.fullscreen',
            )}
            onClick={() => {
                if (active) {
                    void document.exitFullscreen();
                } else {
                    void target.current?.requestFullscreen();
                }
            }}
        >
            {active ? <Minimize2 aria-hidden /> : <Maximize aria-hidden />}
        </IconButton>
    );
}

const COLLAPSED_KEY = 'routelab.charts.collapsed';

const isChartKind = (value: unknown): value is ChartKind =>
    CHART_KINDS.some((kind) => kind === value);

function readCollapsed(): ReadonlySet<ChartKind> {
    try {
        const parsed: unknown = JSON.parse(window.localStorage.getItem(COLLAPSED_KEY) ?? '[]');
        return new Set(Array.isArray(parsed) ? parsed.filter(isChartKind) : []);
    } catch {
        return new Set();
    }
}

function writeCollapsed(kinds: ReadonlySet<ChartKind>) {
    try {
        window.localStorage.setItem(COLLAPSED_KEY, JSON.stringify([...kinds]));
    } catch {
        return;
    }
}

function useCollapsedCharts() {
    const [collapsed, setCollapsed] = useState(readCollapsed);
    const setOne = useCallback((kind: ChartKind, next: boolean) => {
        setCollapsed((current) => {
            const updated = new Set(current);
            if (next) {
                updated.add(kind);
            } else {
                updated.delete(kind);
            }
            writeCollapsed(updated);
            return updated;
        });
    }, []);
    return [collapsed, setOne] as const;
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
    const [collapsedKinds, setCollapsedKind] = useCollapsedCharts();

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
                    collapsed={collapsedKinds.has(kind)}
                    onCollapsedChange={(next) => setCollapsedKind(kind, next)}
                />
            ))}
        </div>
    );
}
