import { useTestRunsList } from '@/api/generated/endpoints/test-runs/test-runs';
import { placeOfRun, type RunPlace } from '@/lib/run-memory';

export const ACTIVE_RUN_PARAMS = { status: 'RUNNING', limit: 1 } as const;
const POLL_MS = 10_000;
const STALE_MS = 5000;

export interface ActiveRun {
    id: string;
    place: RunPlace | undefined;
}

export function useActiveRun() {
    const runs = useTestRunsList(ACTIVE_RUN_PARAMS, {
        query: {
            refetchInterval: (query) =>
                (query.state.data?.items.length ?? 0) > 0 ? POLL_MS : false,
            staleTime: STALE_MS,
            retry: false,
        },
    });
    const item = runs.data?.items[0];
    const active: ActiveRun | null = item ? { id: item.id, place: placeOfRun(item.id) } : null;
    return { active, refetch: runs.refetch };
}
