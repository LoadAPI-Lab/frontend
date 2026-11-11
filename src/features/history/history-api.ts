import { infiniteQueryOptions } from '@tanstack/react-query';

import {
    getTestRunsListQueryKey,
    testRunsList,
} from '@/api/generated/endpoints/test-runs/test-runs';
import { type ListTestRunsResponseDtoItemsItem, TestRunsListStatus } from '@/api/generated/model';

export const HISTORY_PAGE_SIZE = 30;
export const HISTORY_TYPES = ['single', 'scenario'] as const;

export const HISTORY_STATUSES = ['completed', 'stopped', 'failed', 'running'] as const;

export type HistoryType = (typeof HISTORY_TYPES)[number];
export type HistoryStatus = (typeof HISTORY_STATUSES)[number];
export type RunListItem = ListTestRunsResponseDtoItemsItem;

const API_STATUS: Record<HistoryStatus, TestRunsListStatus> = {
    completed: TestRunsListStatus.COMPLETED,
    stopped: TestRunsListStatus.STOPPED,
    failed: TestRunsListStatus.FAILED,
    running: TestRunsListStatus.RUNNING,
};

export const historyQuery = (type: HistoryType | undefined, status?: HistoryStatus) =>
    infiniteQueryOptions({
        queryKey: [
            ...getTestRunsListQueryKey({
                limit: HISTORY_PAGE_SIZE,
                type,
                status: status ? API_STATUS[status] : undefined,
            }),
            'pages',
        ],
        queryFn: ({ pageParam, signal }) =>
            testRunsList(
                {
                    limit: HISTORY_PAGE_SIZE,
                    type,
                    ...(status ? { status: API_STATUS[status] } : {}),
                    ...(pageParam ? { cursor: pageParam } : {}),
                },
                { signal },
            ),
        initialPageParam: '',
        getNextPageParam: (page) => page.nextCursor,
    });

export const sameRoute = (first: RunListItem, second: RunListItem) =>
    first.type === 'single' &&
    second.type === 'single' &&
    first.request?.method === second.request?.method &&
    first.request?.url === second.request?.url;

export function routeRuns(items: readonly RunListItem[], runId: string, count: number) {
    const current = items.find((item) => item.id === runId);
    if (!current) {
        return [];
    }
    const index = items.indexOf(current);
    return items
        .slice(index)
        .filter((item) => sameRoute(item, current))
        .slice(0, count);
}
