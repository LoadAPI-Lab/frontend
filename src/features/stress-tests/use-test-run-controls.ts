import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ApiError, errorCode } from '@/api/fetcher';
import {
    getTestRunsListQueryKey,
    testRunsStart,
    useTestRunsStop,
} from '@/api/generated/endpoints/test-runs/test-runs';
import type { StartTestRunDto } from '@/api/generated/model';
import { useLiveTest } from '@/api/live';
import { toast } from '@/components/ui/toast';
import { isValidJsonBody } from '@/lib/json-body';
import { unresolvedPathParam } from '@/lib/target-url';

import { maskedSecret } from './past-run';
import { DEFAULT_CONFIG, type TestConfig, validateConfig } from './test-config';

export type RunTarget = Extract<StartTestRunDto, { type: 'single' }>['config']['target'];

export const IDEMPOTENCY_KEY_HEADER = 'Idempotency-Key';
const KEY_REUSED = 'TEST_RUN.IDEMPOTENCY_KEY_REUSED';

interface StartAttempt {
    data: StartTestRunDto;
    key: string;
}

const withKey = (key: string) => ({ headers: { [IDEMPOTENCY_KEY_HEADER]: key } });

export type RunPhase = 'idle' | 'starting' | 'running' | 'stopping';

export type StartBlock =
    | { kind: 'noTarget' }
    | { kind: 'noServer' }
    | { kind: 'pathParam'; param: string }
    | { kind: 'maskedSecret'; name: string }
    | { kind: 'invalidBody' }
    | { kind: 'invalidConfig' };

const ACTIVE_STATUSES = new Set(['PENDING', 'RUNNING']);

export interface TestRunControlsOptions {
    target: RunTarget | null;
    body: string;
    runId: string | undefined;
    onRunStarted: (runId: string) => void;
    initialConfig?: TestConfig;
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
    const secret = maskedSecret(target);
    if (secret) {
        return { kind: 'maskedSecret', name: secret };
    }
    if (!isValidJsonBody(body)) {
        return { kind: 'invalidBody' };
    }
    return configValid ? null : { kind: 'invalidConfig' };
}

export function useTestRunControls({
    target,
    body,
    runId,
    onRunStarted,
    initialConfig,
}: TestRunControlsOptions) {
    const { t } = useTranslation();
    const [config, setConfig] = useState<TestConfig>(initialConfig ?? DEFAULT_CONFIG);
    const issues = validateConfig(config);
    const block = startBlock(target, body, Object.keys(issues).length === 0);

    const live = useLiveTest(runId, { durationSeconds: config.durationSeconds ?? undefined });
    const queryClient = useQueryClient();
    const refreshActiveRuns = () =>
        void queryClient.invalidateQueries({ queryKey: getTestRunsListQueryKey() });

    const stop = useTestRunsStop({ mutation: { onSettled: refreshActiveRuns } });

    const pendingKey = useRef<{ fingerprint: string; key: string } | null>(null);
    const keyFor = (data: StartTestRunDto) => {
        const fingerprint = JSON.stringify(data);
        if (pendingKey.current?.fingerprint !== fingerprint) {
            pendingKey.current = { fingerprint, key: crypto.randomUUID() };
        }
        return pendingKey.current.key;
    };

    const start = useMutation({
        mutationFn: async ({ data, key }: StartAttempt) => {
            try {
                return await testRunsStart(data, withKey(key));
            } catch (error) {
                if (errorCode(error) !== KEY_REUSED) {
                    throw error;
                }
                pendingKey.current = null;
                return testRunsStart(data, withKey(keyFor(data)));
            }
        },
        meta: { toastOnError: false },
        onSuccess: (created) => {
            pendingKey.current = null;
            stop.reset();
            refreshActiveRuns();
            onRunStarted(created.id);
        },
        onError: (error) => {
            if (error instanceof ApiError) {
                pendingKey.current = null;
            }
            refreshActiveRuns();
            toast.error({
                title: t('testConfig.startFailed'),
                description:
                    errorCode(error) === 'TEST_RUN.CAPACITY_EXCEEDED'
                        ? t('testConfig.capacityExceeded')
                        : error.message,
            });
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
            const data: StartTestRunDto = {
                type: 'single',
                config: {
                    target: body.trim() === '' ? target : { ...target, body },
                    targetRps: config.targetRps,
                    durationSeconds: config.durationSeconds,
                    rampUpSeconds: config.rampUpSeconds ?? 0,
                },
            };
            start.mutate({ data, key: keyFor(data) });
        },
        stop: () => {
            if (runId) {
                stop.mutate({ id: runId });
            }
        },
    };
}
