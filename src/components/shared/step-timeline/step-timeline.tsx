import { cn } from '@/lib/cn';
import { methodColorClass } from '@/lib/http-method';

export type StepTimelineStatus = 'ok' | 'failed' | 'skipped';

export interface StepTimelineStep {
    key: string;
    number: string;
    method: string;
    path: string;
    status: StepTimelineStatus;
    outcome: string;
    startMs: number;
    durationMs?: number;
}

export interface StepTimelineProps {
    steps: readonly StepTimelineStep[];
    formatTick: (value: number, last: boolean) => string;
    formatDuration: (ms: number) => string;
    'aria-label': string;
    className?: string;
}

const NICE_STEPS = [1, 2, 2.5, 5] as const;
const TARGET_TICKS = 6;
const MIN_BAR_PERCENT = 1;

export function timelineTicks(maxMs: number): number[] {
    if (!Number.isFinite(maxMs) || maxMs <= 0) {
        return [0];
    }
    const raw = maxMs / TARGET_TICKS;
    const magnitude = 10 ** Math.floor(Math.log10(raw));
    const step = (NICE_STEPS.find((nice) => nice * magnitude >= raw) ?? 10) * magnitude;
    const count = Math.ceil(maxMs / step - 1e-9);
    return Array.from({ length: count + 1 }, (_, index) => Number((index * step).toFixed(6)));
}

const numberTone: Record<StepTimelineStatus, string> = {
    ok: 'bg-accent/15 text-accent',
    failed: 'bg-danger/14 text-danger',
    skipped: 'bg-surface-2 text-fg-muted',
};

const outcomeTone: Record<StepTimelineStatus, string> = {
    ok: 'text-accent',
    failed: 'text-danger',
    skipped: 'text-fg-muted',
};

const barTone: Record<StepTimelineStatus, string> = {
    ok: 'bg-accent',
    failed: 'bg-danger',
    skipped: 'bg-transparent',
};

const ROW =
    'grid grid-cols-[1.75rem_4rem_minmax(0,1fr)_3.5rem_minmax(0,1.6fr)_3.5rem] items-center gap-3';

export function StepTimeline({
    steps,
    formatTick,
    formatDuration,
    className,
    ...props
}: StepTimelineProps) {
    const end = Math.max(0, ...steps.map((step) => step.startMs + (step.durationMs ?? 0)));
    const ticks = timelineTicks(end);
    const scale = ticks.at(-1) || 1;
    const percent = (value: number) => (value / scale) * 100;

    return (
        <div className={cn('flex flex-col gap-1', className)}>
            <div
                aria-hidden
                className={ROW}
            >
                <span className="col-span-4" />
                <span className="text-fg-muted relative h-4 font-mono text-xs tabular-nums">
                    {ticks.map((tick, index) => (
                        <span
                            key={tick}
                            className={cn(
                                'absolute top-0',
                                index > 0 && index < ticks.length - 1 && '-translate-x-1/2',
                                index === ticks.length - 1 && '-translate-x-full',
                            )}
                            style={{ left: `${percent(tick)}%` }}
                        >
                            {formatTick(tick, index === ticks.length - 1)}
                        </span>
                    ))}
                </span>
                <span />
            </div>
            <ol
                className="flex flex-col"
                {...props}
            >
                {steps.map((step) => (
                    <li
                        key={step.key}
                        className={cn(ROW, 'border-border border-t py-2.5 first:border-t-0')}
                    >
                        <span
                            className={cn(
                                'flex size-6 items-center justify-center rounded-sm font-mono text-xs font-bold tabular-nums',
                                numberTone[step.status],
                            )}
                        >
                            {step.number}
                        </span>
                        <span
                            className={cn(
                                'text-label font-mono font-bold',
                                methodColorClass(step.method),
                            )}
                        >
                            {step.method}
                        </span>
                        <span className="text-fg-secondary text-control truncate font-mono">
                            {step.path}
                        </span>
                        <span
                            className={cn(
                                'text-label font-mono font-bold tabular-nums',
                                outcomeTone[step.status],
                            )}
                        >
                            {step.outcome}
                        </span>
                        <span
                            aria-hidden
                            className="bg-surface-raised relative h-2.5 overflow-hidden rounded-xs"
                        >
                            {step.durationMs === undefined ? null : (
                                <span
                                    data-bar
                                    className={cn(
                                        'absolute inset-y-0 rounded-xs',
                                        barTone[step.status],
                                    )}
                                    style={{
                                        left: `${percent(step.startMs)}%`,
                                        width: `${Math.max(MIN_BAR_PERCENT, percent(step.durationMs))}%`,
                                    }}
                                />
                            )}
                        </span>
                        <span className="text-fg-secondary text-label text-right font-mono tabular-nums">
                            {step.durationMs === undefined ? '—' : formatDuration(step.durationMs)}
                        </span>
                    </li>
                ))}
            </ol>
        </div>
    );
}
