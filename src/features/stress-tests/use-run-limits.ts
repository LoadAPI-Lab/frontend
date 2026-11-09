import { useTestRunsGet } from '@/api/generated/endpoints/test-runs/test-runs';
import type { TestRunResponseDto } from '@/api/generated/model';

export interface RunLimits {
    targetRps: number;
    durationSeconds: number;
}

export function runLimits(run: TestRunResponseDto): RunLimits | null {
    const { config } = run;
    if (!('targetRps' in config) || !('durationSeconds' in config)) {
        return null;
    }
    const { targetRps, durationSeconds } = config;
    return typeof targetRps === 'number' && typeof durationSeconds === 'number'
        ? { targetRps, durationSeconds }
        : null;
}

export function useRunLimits(runId: string | undefined): RunLimits | null {
    const query = useTestRunsGet(runId ?? '', {
        query: {
            enabled: Boolean(runId),
            staleTime: Number.POSITIVE_INFINITY,
            retry: false,
            select: (run) => (run.id === runId ? runLimits(run) : null),
        },
    });
    return runId ? (query.data ?? null) : null;
}
