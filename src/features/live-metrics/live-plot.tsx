import 'uplot/dist/uPlot.min.css';
import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import uPlot from 'uplot';

import { cn } from '@/lib/cn';

export interface PlotSeries {
    key: string;
    label: string;
    token: string;
    swatch: string;
    width?: number;
    dash?: number[];
    fill?: boolean;
}

export type PlotData = [number[], ...(number | null)[][]];

export type ZoomRange = [number, number];

export interface LivePlotProps {
    series: readonly PlotSeries[];
    data: PlotData;
    values?: readonly (readonly (number | null)[])[];
    bars?: boolean;
    windowSeconds: number;
    yFloor?: number;
    height?: number;
    fill?: boolean;
    zoom?: ZoomRange | null;
    onZoom?: (zoom: ZoomRange | null) => void;
    formatValue: (value: number) => string;
    formatTick?: (value: number) => string;
    label: string;
    browseLabel: string;
    className?: string;
}

interface Hover {
    index: number;
    left: number;
    top: number;
    flip: boolean;
}

const DEFAULT_HEIGHT = 132;
const FIRST_SECOND = 1;
const X_INCREMENTS = [1, 2, 5, 10, 15, 30, 60, 120, 300];
const TOOLTIP_HALF_HEIGHT = 36;
const MIN_ZOOM_SECONDS = 4;
const MIN_DRAG_PIXELS = 4;
const Y_AXIS_SIZE = 48;
const RIGHT_PADDING = 18;
const AXIS_FONT = '11px "JetBrains Mono Variable", monospace';
const Y_INCREMENTS = [
    1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 2500, 5000, 10_000, 20_000, 50_000,
];
const PAGE_STEP = 10;
const KEY_STEPS: Record<string, number> = {
    ArrowLeft: -1,
    ArrowDown: -1,
    ArrowRight: 1,
    ArrowUp: 1,
    PageDown: -PAGE_STEP,
    PageUp: PAGE_STEP,
};
const noop = () => null;
const ignore = () => null;
const roundTick = (value: number) => String(Math.round(value));
const BAR_ANIMATION_MS = 450;
const DEFAULT_GAP_MS = 1000;
const MIN_LINE_ANIMATION_MS = 300;
const MAX_LINE_ANIMATION_MS = 1500;
const GAP_SMOOTHING = 0.3;

const linear = (progress: number) => progress;

export function nextGap(current: number, observed: number) {
    if (observed < MIN_LINE_ANIMATION_MS || observed > MAX_LINE_ANIMATION_MS * 2) {
        return current;
    }
    return current + (observed - current) * GAP_SMOOTHING;
}

export function lineAnimationMs(gap: number) {
    return Math.min(Math.max(gap, MIN_LINE_ANIMATION_MS), MAX_LINE_ANIMATION_MS);
}

const easeOut = (progress: number) => 1 - (1 - progress) ** 3;

function prefersReducedMotion() {
    return (
        typeof window.matchMedia !== 'function' ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
}

export function isSingleAppend(previous: PlotData, next: PlotData) {
    const before = previous[0].length;
    return (
        before > 0 &&
        next[0].length === before + 1 &&
        next[0][before - 1] === previous[0][before - 1]
    );
}

export function appendFrame(
    previous: PlotData,
    next: PlotData,
    progress: number,
    bars: boolean,
): PlotData {
    const last = next[0].length - 1;
    const lerp = (from: number | null | undefined, to: number | null | undefined) =>
        typeof from === 'number' && typeof to === 'number' ? from + (to - from) * progress : to;
    const [elapsed, ...columns] = next;
    const previousColumns = previous.slice(1);
    const frameElapsed = [...elapsed];
    if (!bars) {
        frameElapsed[last] = lerp(elapsed[last - 1], elapsed[last]) ?? elapsed[last] ?? 0;
    }
    return [
        frameElapsed,
        ...columns.map((column, index) => {
            const frame = [...column];
            const from = bars ? 0 : previousColumns[index]?.[last - 1];
            frame[last] = lerp(from, column[last]) ?? null;
            return frame;
        }),
    ];
}

function fullRangeOf(windowSeconds: number, bars: boolean): ZoomRange {
    const padding = bars ? 0.5 : 0;
    return [FIRST_SECOND - padding, Math.max(windowSeconds, FIRST_SECOND + 1) + padding];
}

export function zoomAround(
    current: ZoomRange,
    full: ZoomRange,
    center: number,
    factor: number,
): ZoomRange | null {
    const span = Math.max((current[1] - current[0]) * factor, MIN_ZOOM_SECONDS);
    if (span >= full[1] - full[0]) {
        return null;
    }
    const start = Math.min(Math.max(center - span / 2, full[0]), full[1] - span);
    return [Math.round(start), Math.round(start + span)];
}

const withAlpha = (hex: string, alpha: number) =>
    /^#[\da-f]{6}$/i.test(hex)
        ? `${hex}${Math.round(alpha * 255)
              .toString(16)
              .padStart(2, '0')}`
        : hex;

function drawOrder(count: number, bars: boolean) {
    const order = Array.from({ length: count }, (_, index) => index);
    return bars ? order.toReversed() : order;
}

function toPlotData(data: PlotData, order: readonly number[]): uPlot.AlignedData {
    return [data[0], ...order.map((index) => data[index + 1] ?? [])];
}

function hoverOf(plot: uPlot): Hover | null {
    const { idx, left } = plot.cursor;
    if (idx === null || idx === undefined || left === undefined || left < 0) {
        return null;
    }
    const values = plot.data
        .slice(1)
        .map((column) => column[idx])
        .filter((value): value is number => typeof value === 'number');
    const height = plot.over.clientHeight;
    const top = values.length > 0 ? plot.valToPos(Math.max(...values), 'y') : height / 2;
    return {
        index: idx,
        left: plot.over.offsetLeft + left,
        top:
            plot.over.offsetTop +
            Math.min(Math.max(top, TOOLTIP_HALF_HEIGHT), height - TOOLTIP_HALF_HEIGHT),
        flip: left > plot.over.clientWidth / 2,
    };
}

interface OptionsInput {
    width: number;
    height: number;
    xRange: () => ZoomRange;
    onSelect: (range: ZoomRange) => void;
    onReset: () => void;
    formatTick: (value: number) => string;
    series: readonly PlotSeries[];
    order: readonly number[];
    bars: boolean;
    yFloor: number;
    color: (token: string) => string;
    onHover: (hover: Hover | null) => void;
}

function plotOptions({
    width,
    height,
    xRange,
    onSelect,
    onReset,
    formatTick,
    series,
    order,
    bars,
    yFloor,
    color,
    onHover,
}: OptionsInput): uPlot.Options {
    const barPaths = bars ? uPlot.paths.bars?.({ size: [0.7, 14], gap: 1 }) : undefined;
    const splinePaths = bars ? undefined : uPlot.paths.spline?.();
    return {
        width,
        height,
        legend: { show: false },
        cursor: {
            x: true,
            y: false,
            drag: { setScale: false, x: true, y: false },
            points: { show: !bars, size: 7, width: 2, fill: color('--color-surface-1') },
            bind: {
                dblclick: () => () => {
                    onReset();
                    return null;
                },
            },
        },
        select: { show: true, left: 0, top: 0, width: 0, height: 0 },
        hooks: {
            setCursor: [(plot) => onHover(hoverOf(plot))],
            setSelect: [
                (plot) => {
                    const { left, width: selected } = plot.select;
                    plot.setSelect({ left: 0, top: 0, width: 0, height: 0 }, false);
                    if (selected < MIN_DRAG_PIXELS) {
                        return;
                    }
                    const from = Math.floor(plot.posToVal(left, 'x'));
                    const to = Math.ceil(plot.posToVal(left + selected, 'x'));
                    if (to - from >= 2) {
                        onSelect([from, Math.max(to, from + MIN_ZOOM_SECONDS)]);
                    }
                },
            ],
        },
        padding: [8, RIGHT_PADDING, 0, 6],
        scales: {
            x: { time: false, range: () => xRange() },
            y: {
                range: (_plot, _min, max) => [
                    0,
                    Math.max(yFloor, Math.ceil((Number.isFinite(max) ? max : 0) * 1.2)),
                ],
            },
        },
        axes: [
            {
                stroke: color('--color-fg-subtle'),
                font: AXIS_FONT,
                size: 26,
                gap: 6,
                incrs: X_INCREMENTS,
                grid: { show: false },
                ticks: { show: false },
                values: (_plot, splits) => splits.map((split) => `${split}s`),
            },
            {
                size: Y_AXIS_SIZE,
                gap: 4,
                stroke: color('--color-fg-subtle'),
                font: AXIS_FONT,
                ticks: { show: false },
                grid: { stroke: color('--color-border-strong'), width: 1 },
                space: 28,
                incrs: Y_INCREMENTS,
                values: (_plot, splits) => splits.map((split) => formatTick(split)),
            },
        ],
        series: [
            {},
            ...order.map((index): uPlot.Series => {
                const line = series[index];
                const stroke = line ? color(line.token) : '';
                if (bars) {
                    return {
                        label: line?.key,
                        stroke,
                        fill: withAlpha(stroke, 0.85),
                        width: 0,
                        paths: barPaths,
                        points: { show: false },
                    };
                }
                return {
                    label: line?.key,
                    stroke,
                    width: line?.width ?? 1,
                    dash: line?.dash,
                    paths: splinePaths,
                    points: { show: false },
                    spanGaps: false,
                    ...(line?.fill
                        ? {
                              fill: (plot: uPlot) => {
                                  const gradient = plot.ctx.createLinearGradient(
                                      0,
                                      plot.bbox.top,
                                      0,
                                      plot.bbox.top + plot.bbox.height,
                                  );
                                  gradient.addColorStop(0, withAlpha(stroke, 0.28));
                                  gradient.addColorStop(1, withAlpha(stroke, 0));
                                  return gradient;
                              },
                          }
                        : {}),
                };
            }),
        ],
    };
}

export function LivePlot({
    series,
    data,
    values,
    bars = false,
    windowSeconds,
    yFloor = 10,
    height = DEFAULT_HEIGHT,
    fill = false,
    zoom = null,
    onZoom = ignore,
    formatValue,
    formatTick = roundTick,
    label,
    browseLabel,
    className,
}: LivePlotProps) {
    const { t } = useTranslation();
    const captionId = useId();
    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<uPlot | null>(null);
    const order = drawOrder(series.length, bars);
    const latest = useRef({
        data,
        windowSeconds,
        order,
        series,
        bars,
        yFloor,
        height,
        fill,
        zoom,
        onZoom,
        formatTick,
    });
    const [hover, setHover] = useState<Hover | null>(null);
    const [keyboardIndex, setKeyboardIndex] = useState<number | null>(null);

    const shown = values ?? data.slice(1);
    const count = data[0].length;
    const lastIndex = Math.max(0, count - 1);
    const focusedIndex = Math.min(keyboardIndex ?? lastIndex, lastIndex);

    const display = (value: number | null | undefined) =>
        typeof value === 'number' ? formatValue(value) : '—';
    const pointText = (index: number) =>
        t('liveMetrics.charts.point', {
            second: data[0][index] ?? 0,
            values: series
                .map((line, position) =>
                    t('liveMetrics.charts.value', {
                        label: line.label,
                        value: display(shown[position]?.[index]),
                    }),
                )
                .join(', '),
        });

    const moveCursor = (index: number) => {
        const chart = chartRef.current;
        const second = latest.current.data[0][index];
        if (!chart || second === undefined) {
            return;
        }
        chart.setCursor({ left: chart.valToPos(second, 'x'), top: 0 });
    };

    const browseTo = (index: number) => {
        const clamped = Math.min(Math.max(index, 0), lastIndex);
        setKeyboardIndex(clamped);
        moveCursor(clamped);
    };

    const zoomBy = (factor: number) => {
        const full = fullRangeOf(windowSeconds, bars);
        const center = data[0][focusedIndex] ?? (full[0] + full[1]) / 2;
        onZoom(zoomAround(zoom ?? full, full, center, factor));
    };

    const clearCursor = () => {
        chartRef.current?.setCursor({ left: -10, top: -10 });
    };

    const arrivals = useRef<{ lastAt: number | null; gap: number }>({
        lastAt: null,
        gap: DEFAULT_GAP_MS,
    });

    useEffect(() => {
        const previous = latest.current.data;
        latest.current = { ...latest.current, data, windowSeconds };
        const chart = chartRef.current;
        const { order: drawn, bars: asBars } = latest.current;
        const startedAt = performance.now();
        const appended = isSingleAppend(previous, data);
        if (appended) {
            const { lastAt, gap } = arrivals.current;
            arrivals.current = {
                lastAt: startedAt,
                gap: lastAt === null ? gap : nextGap(gap, startedAt - lastAt),
            };
        }
        if (!chart || !appended || prefersReducedMotion()) {
            chart?.setData(toPlotData(data, drawn));
            return noop;
        }
        const duration = asBars ? BAR_ANIMATION_MS : lineAnimationMs(arrivals.current.gap);
        const ease = asBars ? easeOut : linear;
        let frame = 0;
        const step = (now: number) => {
            const progress = Math.min(1, (now - startedAt) / duration);
            chart.setData(toPlotData(appendFrame(previous, data, ease(progress), asBars), drawn));
            if (progress < 1) {
                frame = requestAnimationFrame(step);
            }
        };
        frame = requestAnimationFrame(step);
        return () => {
            cancelAnimationFrame(frame);
            if (chartRef.current === chart) {
                chart.setData(toPlotData(data, drawn));
            }
        };
    }, [data, windowSeconds]);

    useEffect(() => {
        latest.current = { ...latest.current, onZoom, formatTick };
    });

    useEffect(() => {
        latest.current = { ...latest.current, zoom };
        const [min, max] = zoom ?? fullRangeOf(latest.current.windowSeconds, latest.current.bars);
        chartRef.current?.setScale('x', { min, max });
    }, [zoom]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) {
            return noop;
        }
        const styles = getComputedStyle(container);
        const initial = latest.current;
        const chart = new uPlot(
            plotOptions({
                width: container.clientWidth,
                height: initial.fill ? container.clientHeight || initial.height : initial.height,
                xRange: () =>
                    latest.current.zoom ??
                    fullRangeOf(latest.current.windowSeconds, latest.current.bars),
                onSelect: (range) => latest.current.onZoom(range),
                onReset: () => latest.current.onZoom(null),
                formatTick: (value) => latest.current.formatTick(value),
                series: initial.series,
                order: initial.order,
                bars: initial.bars,
                yFloor: initial.yFloor,
                color: (token) => styles.getPropertyValue(token).trim(),
                onHover: setHover,
            }),
            toPlotData(initial.data, initial.order),
            container,
        );
        chartRef.current = chart;
        if (initial.zoom) {
            chart.setScale('x', { min: initial.zoom[0], max: initial.zoom[1] });
        }

        const observer =
            typeof ResizeObserver === 'undefined'
                ? null
                : new ResizeObserver(([entry]) => {
                      if (entry) {
                          chart.setSize({
                              width: Math.floor(entry.contentRect.width),
                              height: initial.fill
                                  ? Math.floor(entry.contentRect.height) || initial.height
                                  : initial.height,
                          });
                      }
                  });
        observer?.observe(container);

        return () => {
            observer?.disconnect();
            chart.destroy();
            chartRef.current = null;
        };
    }, []);

    return (
        <figure
            aria-labelledby={captionId}
            className={cn(
                'relative w-full rounded-md',
                fill && 'flex flex-col',
                'has-[:focus-visible]:outline-accent has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-4',
                '[&_.u-cursor-x]:border-fg-faint',
                className,
            )}
        >
            <figcaption
                id={captionId}
                className="sr-only"
            >
                {label}
            </figcaption>
            <input
                type="range"
                className="sr-only"
                aria-label={browseLabel}
                aria-keyshortcuts="+ - 0"
                min={0}
                max={lastIndex}
                step={1}
                value={focusedIndex}
                aria-valuetext={count > 0 ? pointText(focusedIndex) : undefined}
                disabled={count === 0}
                onFocus={() => browseTo(focusedIndex)}
                onBlur={() => {
                    setKeyboardIndex(null);
                    clearCursor();
                }}
                onKeyDown={(event) => {
                    const step = KEY_STEPS[event.key];
                    let target: number | null = null;
                    if (step !== undefined) {
                        target = focusedIndex + step;
                    } else if (event.key === 'Home') {
                        target = 0;
                    } else if (event.key === 'End') {
                        target = lastIndex;
                    } else if (event.key === '+' || event.key === '=') {
                        event.preventDefault();
                        zoomBy(0.5);
                    } else if (event.key === '-') {
                        event.preventDefault();
                        zoomBy(2);
                    } else if (event.key === '0') {
                        event.preventDefault();
                        onZoom(null);
                    }
                    if (target !== null) {
                        event.preventDefault();
                        browseTo(target);
                    }
                }}
                onChange={(event) => browseTo(Number(event.currentTarget.value))}
            />
            <div
                ref={containerRef}
                aria-hidden
                className={fill ? 'min-h-0 flex-1 overflow-hidden' : undefined}
            />
            {hover && hover.index < count ? (
                <div
                    aria-hidden
                    data-testid="chart-tooltip"
                    className="bg-surface-raised/70 border-border-strong/80 pointer-events-none absolute z-10 flex min-w-32 flex-col gap-1.5 rounded-md border px-2.5 py-2 shadow-lg shadow-black/30 backdrop-blur-[2px]"
                    style={{
                        left: hover.left,
                        top: hover.top,
                        transform: hover.flip
                            ? 'translate(calc(-100% - 12px), -50%)'
                            : 'translate(12px, -50%)',
                    }}
                >
                    <p className="text-fg-muted font-mono text-xs tabular-nums">
                        {t('liveMetrics.charts.at', { second: data[0][hover.index] ?? 0 })}
                    </p>
                    <ul className="flex flex-col gap-1">
                        {series.map((line, position) => (
                            <li
                                key={line.key}
                                className="text-label flex items-center gap-2"
                            >
                                <span
                                    className={cn(
                                        bars ? 'size-1.75 rounded-xs' : 'h-0.5 w-2',
                                        'shrink-0',
                                        line.swatch,
                                    )}
                                />
                                <span className="text-fg-muted">{line.label}</span>
                                <span className="text-fg ml-auto font-mono font-bold tabular-nums">
                                    {display(shown[position]?.[hover.index])}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            ) : null}
        </figure>
    );
}
