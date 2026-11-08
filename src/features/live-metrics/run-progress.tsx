import { useTranslation } from 'react-i18next';

import type { RunStatus } from '@/api/live';
import { cn } from '@/lib/cn';
import { formatClock } from '@/lib/format';

const TONES = {
    PENDING: {
        text: 'text-fg-muted',
        fill: 'bg-fg-muted',
        bar: '[&::-webkit-progress-value]:bg-fg-muted [&::-moz-progress-bar]:bg-fg-muted',
    },
    RUNNING: {
        text: 'text-accent',
        fill: 'bg-accent',
        bar: '[&::-webkit-progress-value]:bg-accent [&::-moz-progress-bar]:bg-accent',
    },
    COMPLETED: {
        text: 'text-info',
        fill: 'bg-info',
        bar: '[&::-webkit-progress-value]:bg-info [&::-moz-progress-bar]:bg-info',
    },
    FAILED: {
        text: 'text-danger',
        fill: 'bg-danger',
        bar: '[&::-webkit-progress-value]:bg-danger [&::-moz-progress-bar]:bg-danger',
    },
    STOPPED: {
        text: 'text-warning',
        fill: 'bg-warning',
        bar: '[&::-webkit-progress-value]:bg-warning [&::-moz-progress-bar]:bg-warning',
    },
} as const satisfies Record<RunStatus, { text: string; fill: string; bar: string }>;

export interface RunProgressProps {
    status: RunStatus | null;
    elapsedSeconds: number;
    durationSeconds: number | null;
    className?: string;
}

export function RunProgress({
    status,
    elapsedSeconds,
    durationSeconds,
    className,
}: RunProgressProps) {
    const { t } = useTranslation();
    const shown = status ?? 'PENDING';
    const tone = TONES[shown];
    const ratio =
        shown === 'COMPLETED'
            ? 1
            : durationSeconds
              ? Math.min(1, Math.max(0, elapsedSeconds / durationSeconds))
              : 0;
    const percent = Math.round(ratio * 100);

    return (
        <div className={cn('flex w-55 shrink-0 flex-col gap-1.75', className)}>
            <div className="flex items-center justify-between gap-4">
                <output
                    className={cn(
                        'text-label flex items-center gap-1.5 font-bold uppercase',
                        tone.text,
                    )}
                >
                    <span
                        aria-hidden
                        className={cn('size-1.75 rounded-full', tone.fill)}
                    />
                    {t(`runStatus.${shown}`)}
                </output>
                <span className="text-fg-muted text-label font-mono tabular-nums">
                    {durationSeconds
                        ? t('runStatus.clock', {
                              elapsed: formatClock(elapsedSeconds),
                              duration: formatClock(durationSeconds),
                          })
                        : formatClock(elapsedSeconds)}
                </span>
            </div>
            <progress
                aria-label={t('runStatus.progress')}
                max={100}
                value={percent}
                className={cn(
                    'bg-track h-1 w-full appearance-none overflow-hidden rounded-xs border-0',
                    '[&::-webkit-progress-bar]:bg-track [&::-webkit-progress-value]:rounded-xs [&::-webkit-progress-value]:transition-[width] [&::-webkit-progress-value]:duration-700 [&::-moz-progress-bar]:rounded-xs',
                    tone.bar,
                )}
            />
        </div>
    );
}
