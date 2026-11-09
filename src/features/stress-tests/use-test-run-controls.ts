import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { errorCode } from '@/api/fetcher';
import {
    getTestRunsListQueryKey,
    useTestRunsStart,
    useTestRunsStop,
} from '@/api/generated/endpoints/test-runs/test-runs';
import type { StartTestRunDto } from '@/api/generated/model';
import { useLiveTest } from '@/api/live';
import { toast } from '@/components/ui/toast';
import { isValidJsonBody } from '@/lib/json-body';
import { unresolvedPathParam } from '@/lib/target-url';

import { DEFAULT_CONFIG, type TestConfig, validateConfig } from './test-config';

export type RunTarget = Extract<StartTestRunDto, { type: 'single' }>['config']['target'];

export type RunPhase = 'idle' | 'starting' | 'running' | 'stopping';

export type StartBlock =
    | { kind: 'noTarget' }
    | { kind: 'noServer' }
    | { kind: 'pathParam'; param: string }
    | { kind: 'invalidBody' }
    | { kind: 'invalidConfig' };

const ACTIVE_STATUSES = new Set(['PENDING', 'RUNNING']);

export interface TestRunControlsOptions {
    target: RunTarget | null;
    body: string;
    runId: string | undefined;
    onRunStarted: (runId: string) => void;
}

function startBlock(
    target: RunTarget | null,
    body: string,
    configValid: boolean,
): StartBlock | null {
    if (!target) {
        return { kind: 'noTarget' };
    }
    if (!/^https?:\/\/[^/]/i.test(target.url)) {
        return { kind: 'noServer' };
    }
    const param = unresolvedPathParam(target.url);
    if (param) {
        return { kind: 'pathParam', param };
    }
    if (!isValidJsonBody(body)) {
        return { kind: 'invalidBody' };
    }
    return configValid ? null : { kind: 'invalidConfig' };
}

export function useTestRunControls({ target, body, runId, onRunStarted }: TestRunControlsOptions) {
    const { t } = useTranslation();
    const [config, setConfig] = useState<TestConfig>(DEFAULT_CONFIG);
    const issues = validateConfig(config);
    const block = startBlock(target, body, Object.keys(issues).length === 0);

    const live = useLiveTest(runId, { durationSeconds: config.durationSeconds ?? undefined });
    const queryClient = useQueryClient();
    const refreshActiveRuns = () =>
        void queryClient.invalidateQueries({ queryKey: getTestRunsListQueryKey() });

    const stop = useTestRunsStop({ mutation: { onSettled: refreshActiveRuns } });

    const start = useTestRunsStart({
        mutation: {
            meta: { toastOnError: false },
            onSuccess: (created) => {
                stop.reset();
                refreshActiveRuns();
                onRunStarted(created.id);
            },
            onError: (error) => {
                refreshActiveRuns();
                toast.error({
                    title: t('testConfig.startFailed'),
                    description:
                        errorCode(error) === 'TEST_RUN.CAPACITY_EXCEEDED'
                            ? t('testConfig.capacityExceeded')
                            : error.message,
                });
            },
        },
    });

    const streaming = ['connecting', 'open', 'reconnecting'].includes(live.connection);
    const active = Boolean(runId) && (live.status ? ACTIVE_STATUSES.has(live.status) : streaming);
    let phase: RunPhase = 'idle';
    if (start.isPending) {
        phase = 'starting';
    } else if (active && (stop.isPending || stop.isSuccess)) {
        phase = 'stopping';
    } else if (active) {
        phase = 'running';
    }

    return {
        live,
        config,
        setConfig,
        issues,
        block,
        phase,
        start: () => {
            if (block || !target || config.targetRps === null || config.durationSeconds === null) {
                return;
            }
            start.mutate({
                data: {
                    type: 'single',
                    config: {
                        target: body.trim() === '' ? target : { ...target, body },
                        targetRps: config.targetRps,
                        durationSeconds: config.durationSeconds,
                        rampUpSeconds: config.rampUpSeconds ?? 0,
                    },
                },
            });
        },
        stop: () => {
            if (runId) {
                stop.mutate({ id: runId });
            }
        },
    };
}
