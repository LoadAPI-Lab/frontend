import { Link } from '@tanstack/react-router';
import { CircleDot, Radio, Square } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { RunStatus } from '@/api/live';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { RunProgress } from '@/features/live-metrics';
import { cn } from '@/lib/cn';
import { placeOfRun, placeSearch } from '@/lib/run-memory';

import { elapsedSeconds } from './history-format';
import { useStopRun } from './use-stop-run';

const TICK_MS = 1000;

export interface StopRunButtonProps {
    runId: string;
}

export function StopRunButton({ runId }: StopRunButtonProps) {
    const { t } = useTranslation();
    const stop = useStopRun(runId);
    const stopping = stop.isPending || stop.isSuccess;
    return (
        <Button
            variant="danger"
            disabled={stopping}
            onClick={() => stop.mutate({ id: runId })}
        >
            <Square
                aria-hidden
                className="size-3.5"
            />
            {stopping ? t('history.live.stopping') : t('history.live.stop')}
        </Button>
    );
}

export interface ViewLiveLinkProps {
    runId: string;
}

export function ViewLiveLink({ runId }: ViewLiveLinkProps) {
    const { t } = useTranslation();
    return (
        <Link
            to="/tests"
            search={{ ...placeSearch(placeOfRun(runId)), run: runId }}
            className={cn(
                buttonVariants({ variant: 'primary' }),
                'focus-visible:ring-accent/40 outline-none focus-visible:ring-2',
            )}
        >
            <Radio
                aria-hidden
                className="size-3.5"
            />
            {t('history.live.view')}
        </Link>
    );
}

export interface RunInProgressProps {
    status: RunStatus;
    startedAt: string | undefined;
    durationSeconds: number;
    className?: string;
}

export function RunInProgress({
    status,
    startedAt,
    durationSeconds,
    className,
}: RunInProgressProps) {
    const { t } = useTranslation();
    const [now, setNow] = useState(Date.now);
    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), TICK_MS);
        return () => clearInterval(timer);
    }, []);
    const pending = status === 'PENDING';
    const elapsed = pending ? 0 : Math.min(durationSeconds, elapsedSeconds(startedAt, now));

    return (
        <Card
            className={cn('flex items-center gap-4', className)}
            aria-labelledby="run-in-progress-title"
        >
            <CircleDot
                aria-hidden
                className="text-info size-5 shrink-0"
            />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <CardTitle
                    id="run-in-progress-title"
                    className="text-md font-bold"
                >
                    {pending ? t('history.live.pendingTitle') : t('history.live.title')}
                </CardTitle>
                <p className="text-fg-muted text-sm">{t('history.live.body')}</p>
            </div>
            <RunProgress
                status={status}
                elapsedSeconds={elapsed}
                durationSeconds={durationSeconds}
            />
        </Card>
    );
}
