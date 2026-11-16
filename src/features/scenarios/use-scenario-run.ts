import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { errorCode } from '@/api/fetcher';
import {
    getTestRunsGetQueryKey,
    getTestRunsListQueryKey,
    testRunsGet,
    testRunsStart,
    useTestRunsStop,
} from '@/api/generated/endpoints/test-runs/test-runs';
import type { TestRunResponseDto } from '@/api/generated/model';
import { isFinalStatus, useLiveTest } from '@/api/live';
import { toast } from '@/components/ui/toast';

import { configFingerprint, type ScenarioConfig } from './scenario-draft';
import { rememberScenarioRun, useScenarioStore } from './scenario-store';

type RunResult = NonNullable<TestRunResponseDto['result']>;
export type ScenarioResult = Extract<RunResult, { summary: unknown }>;
export type StepResult = ScenarioResult['steps'][number];

const RESULT_POLL_MS = 500;

export type ScenarioRunPhase = 'idle' | 'starting' | 'running' | 'stopping';

const isScenarioResult = (result: RunResult | undefined): result is ScenarioResult =>
    result !== undefined && 'summary' in result;

export function useScenarioRun(key: string, config: ScenarioConfig) {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const memory = useScenarioStore().runs[key];
    const runId = memory?.runId;
    const live = useLiveTest(runId);
    const final = live.isFinal;

    const run = useQuery({
        queryKey: getTestRunsGetQueryKey(runId ?? ''),
        queryFn: ({ signal }) => testRunsGet(runId ?? '', { signal }),
        enabled: Boolean(runId) && final,
        refetchInterval: (query) => {
            const data = query.state.data;
            return data && !isFinalStatus(data.status) ? RESULT_POLL_MS : false;
        },
    });

    const refreshRuns = () =>
        void queryClient.invalidateQueries({ queryKey: getTestRunsListQueryKey() });

    const stop = useTestRunsStop({ mutation: { onSettled: refreshRuns } });

    const start = useMutation({
        mutationFn: (startConfig: ScenarioConfig) =>
            testRunsStart(
                { type: 'scenario', config: startConfig },
                { headers: { 'Idempotency-Key': crypto.randomUUID() } },
            ),
        meta: { toastOnError: false },
        onSuccess: (created, startConfig) => {
            stop.reset();
            rememberScenarioRun(key, {
                runId: created.id,
                fingerprint: configFingerprint(startConfig),
            });
            refreshRuns();
        },
        onError: (error) => {
            toast.error({
                title: t('scenarios.run.startFailed'),
                description:
                    errorCode(error) === 'TEST_RUN.CAPACITY_EXCEEDED'
                        ? t('testConfig.capacityExceeded')
                        : error.message,
            });
        },
    });

    const active =
        Boolean(runId) &&
        !final &&
        ['connecting', 'open', 'reconnecting'].includes(live.connection);
    let phase: ScenarioRunPhase = 'idle';
    if (start.isPending) {
        phase = 'starting';
    } else if (active && (stop.isPending || stop.isSuccess)) {
        phase = 'stopping';
    } else if (active) {
        phase = 'running';
    }

    const result = isScenarioResult(run.data?.result) ? run.data.result : null;

    return {
        runId,
        phase,
        status: live.status,
        reason: live.reason ?? run.data?.reason ?? null,
        result,
        loadingResult: final && run.isPending,
        stale: Boolean(memory) && memory?.fingerprint !== configFingerprint(config),
        finishedAt: run.data?.finishedAt ?? null,
        start: () => start.mutate(config),
        stop: () => {
            if (runId) {
                stop.mutate({ id: runId });
            }
        },
    };
}
