import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { useTestRunsGet } from '@/api/generated/endpoints/test-runs/test-runs';
import type { TestRunResponseDto } from '@/api/generated/model';
import { type LiveTest, type RunStatus, type RunSummary, summarizeRunResult } from '@/api/live';
import { toast } from '@/components/ui/toast';

const RESULT_POLL_MS = 1000;
const MAX_RESULT_POLLS = 10;
const ACTIVE_STATUSES: ReadonlySet<RunStatus> = new Set(['PENDING', 'RUNNING']);

export interface RunOutcome {
    summary: RunSummary | null;
    failure: string | null;
}

function awaitingResult(run: TestRunResponseDto | undefined) {
    return run !== undefined && run.status !== 'FAILED' && run.result === undefined;
}

export function useRunOutcome(
    runId: string | undefined,
    live: Pick<LiveTest, 'status' | 'reason' | 'isFinal'>,
): RunOutcome {
    const { t } = useTranslation();
    const query = useTestRunsGet(runId ?? '', {
        query: {
            enabled: Boolean(runId) && live.isFinal,
            retry: false,
            refetchInterval: (current) =>
                awaitingResult(current.state.data) &&
                current.state.dataUpdateCount < MAX_RESULT_POLLS
                    ? RESULT_POLL_MS
                    : false,
        },
    });
    const run = runId && query.data?.id === runId ? query.data : undefined;
    const reason = live.reason ?? run?.reason ?? null;
    const failed = live.status === 'FAILED' || run?.status === 'FAILED';

    const watched = useRef<string | null>(null);
    const announced = useRef<string | null>(null);

    useEffect(() => {
        if (!runId || !live.status) {
            return;
        }
        if (ACTIVE_STATUSES.has(live.status)) {
            watched.current = runId;
            return;
        }
        if (watched.current !== runId || announced.current === runId) {
            return;
        }
        announced.current = runId;
        if (live.status === 'COMPLETED') {
            toast.success({ title: t('runOutcome.completed') });
        } else if (live.status === 'STOPPED') {
            toast.info({ title: t('runOutcome.stopped'), description: reason ?? undefined });
        } else {
            toast.error({
                title: t('runOutcome.failed'),
                description: reason ?? t('runOutcome.noReason'),
            });
        }
    }, [runId, live.status, reason, t]);

    return {
        summary: run ? summarizeRunResult(run.result) : null,
        failure: failed ? (reason ?? t('runOutcome.noReason')) : null,
    };
}
