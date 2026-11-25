import { useQueryClient } from '@tanstack/react-query';

import {
    getTestRunsGetQueryKey,
    getTestRunsListQueryKey,
    useTestRunsStop,
} from '@/api/generated/endpoints/test-runs/test-runs';

export function useStopRun(runId: string) {
    const queryClient = useQueryClient();
    return useTestRunsStop({
        mutation: {
            onSettled: () => {
                void queryClient.invalidateQueries({ queryKey: getTestRunsGetQueryKey(runId) });
                void queryClient.invalidateQueries({ queryKey: getTestRunsListQueryKey() });
            },
        },
    });
}
