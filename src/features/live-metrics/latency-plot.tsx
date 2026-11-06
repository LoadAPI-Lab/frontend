import 'uplot/dist/uPlot.min.css';
import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import uPlot from 'uplot';

import type { LatencySeries } from '@/api/live';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';

export const LATENCY_LINES = [
    { key: 'p50', token: '--color-fg-muted', swatch: 'bg-fg-muted', width: 1.5 },
    { key: 'p95', token: '--color-info', swatch: 'bg-info', width: 1.5 },
    { key: 'p99', token: '--color-accent', swatch: 'bg-accent', width: 2 },
] as const;

const HEIGHT = 132;
const FIRST_SECOND = 1;
const X_INCREMENTS = [1, 2, 5, 10, 15, 30, 60, 120, 300];
const TOOLTIP_HALF_HEIGHT = 36;
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

export interface LatencyPlotProps {
    data: LatencySeries;
    windowSeconds: number;
    label: string;
    className?: string;
}

interface Hover {
    index: number;
    left: number;
    top: number;
    flip: boolean;
}

const withAlpha = (hex: string, alpha: number) =>
    /^#[\da-f]{6}$/i.test(hex)
        ? `${hex}${Math.round(alpha * 255)
              .toString(16)
              .padStart(2, '0')}`
        : hex;

function hoverOf(plot: uPlot): Hover | null {
    const { idx, left } = plot.cursor;
    if (idx === null || idx === undefined || left === undefined || left < 0) {
        return null;
    }
    const highest = [3, 2, 1]
        .map((series) => plot.data[series]?.[idx])
        .find((value) => typeof value === 'number');
    const height = plot.over.clientHeight;
    const top = typeof highest === 'number' ? plot.valToPos(highest, 'y') : height / 2;
    return {
        index: idx,
        left: plot.over.offsetLeft + left,
        top:
            plot.over.offsetTop +
            Math.min(Math.max(top, TOOLTIP_HALF_HEIGHT), height - TOOLTIP_HALF_HEIGHT),
        flip: left > plot.over.clientWidth / 2,
    };
}

function plotOptions(
    width: number,
    color: (token: string) => string,
    windowSeconds: () => number,
    onHover: (hover: Hover | null) => void,
): uPlot.Options {
    const accent = color('--color-accent');
    return {
        width,
        height: HEIGHT,
        legend: { show: false },
        cursor: {
            x: true,
            y: false,
            drag: { setScale: false, x: false, y: false },
            points: { size: 7, width: 2, fill: color('--color-surface-1') },
        },
        hooks: { setCursor: [(plot) => onHover(hoverOf(plot))] },
        padding: [8, 6, 0, 6],
        scales: {
            x: {
                time: false,
                range: () => [FIRST_SECOND, Math.max(windowSeconds(), FIRST_SECOND + 1)],
            },
            y: {
                range: (_plot, _min, max) => [
                    0,
                    Math.max(10, Math.ceil((Number.isFinite(max) ? max : 0) * 1.2)),
                ],
            },
        },
        axes: [
            {
                stroke: color('--color-fg-subtle'),
                font: '9.5px "JetBrains Mono Variable", monospace',
                size: 22,
                gap: 6,
                incrs: X_INCREMENTS,
                grid: { show: false },
                ticks: { show: false },
                values: (_plot, splits) => splits.map((split) => `${split}s`),
            },
            {
                size: 0,
                ticks: { show: false },
                grid: { stroke: color('--color-border-strong'), width: 1 },
                splits: (_plot, _axis, min, max) =>
                    [0.25, 0.5, 0.75].map((fraction) => min + (max - min) * fraction),
                values: (_plot, splits) => splits.map(() => ''),
            },
        ],
        series: [
            {},
            ...LATENCY_LINES.map((line): uPlot.Series => ({
                label: line.key,
                stroke: color(line.token),
                width: line.width,
                points: { show: false },
                spanGaps: false,
                ...(line.key === 'p99'
                    ? {
                          fill: (plot: uPlot) => {
                              const gradient = plot.ctx.createLinearGradient(
                                  0,
                                  plot.bbox.top,
                                  0,
                                  plot.bbox.top + plot.bbox.height,
                              );
                              gradient.addColorStop(0, withAlpha(accent, 0.28));
                              gradient.addColorStop(1, withAlpha(accent, 0));
                              return gradient;
                          },
                      }
                    : {}),
            })),
        ],
    };
}

export function LatencyPlot({ data, windowSeconds, label, className }: LatencyPlotProps) {
    const { t, i18n } = useTranslation();
    const captionId = useId();
    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<uPlot | null>(null);
    const latest = useRef({ data, windowSeconds });
    const [hover, setHover] = useState<Hover | null>(null);
    const [keyboardIndex, setKeyboardIndex] = useState<number | null>(null);

    const count = data[0].length;
    const lastIndex = Math.max(0, count - 1);
    const focusedIndex = Math.min(keyboardIndex ?? lastIndex, lastIndex);

    const ms = (value: number | null | undefined) =>
        typeof value === 'number'
            ? t('liveMetrics.latency.ms', { value: formatNumber(value, 0, i18n.language) })
            : '—';
    const pointText = (index: number) =>
        t('liveMetrics.latency.point', {
            second: data[0][index] ?? 0,
            p50: ms(data[1][index]),
            p95: ms(data[2][index]),
            p99: ms(data[3][index]),
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

    const clearCursor = () => {
        chartRef.current?.setCursor({ left: -10, top: -10 });
    };

    useEffect(() => {
        latest.current = { data, windowSeconds };
        chartRef.current?.setData(data);
    }, [data, windowSeconds]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) {
            return noop;
        }
        const styles = getComputedStyle(container);
        const color = (token: string) => styles.getPropertyValue(token).trim();
        const chart = new uPlot(
            plotOptions(container.clientWidth, color, () => latest.current.windowSeconds, setHover),
            latest.current.data,
            container,
        );
        chartRef.current = chart;

        const observer =
            typeof ResizeObserver === 'undefined'
                ? null
                : new ResizeObserver(([entry]) => {
                      if (entry) {
                          chart.setSize({
                              width: Math.floor(entry.contentRect.width),
                              height: HEIGHT,
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
                aria-label={t('liveMetrics.latency.browse')}
                min={0}
                max={lastIndex}
                step={1}
                value={focusedIndex}
                aria-valuetext={count > 0 ? pointText(focusedIndex) : undefined}
                disabled={count === 0}
                onFocus={() => {
                    setKeyboardIndex(focusedIndex);
                    moveCursor(focusedIndex);
                }}
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
            />
            {hover && hover.index < count ? (
                <div
                    aria-hidden
                    data-testid="latency-tooltip"
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
                        {t('liveMetrics.latency.at', { second: data[0][hover.index] ?? 0 })}
                    </p>
                    <ul className="flex flex-col gap-1">
                        {LATENCY_LINES.map((line, offset) => (
                            <li
                                key={line.key}
                                className="text-label flex items-center gap-2"
                            >
                                <span className={cn('h-0.5 w-2 shrink-0', line.swatch)} />
                                <span className="text-fg-muted">
                                    {t(`liveMetrics.latency.lines.${line.key}`)}
                                </span>
                                <span className="text-fg ml-auto font-mono font-bold tabular-nums">
                                    {ms(data[offset + 1]?.[hover.index])}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            ) : null}
        </figure>
    );
}
