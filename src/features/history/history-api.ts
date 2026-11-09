import { infiniteQueryOptions } from '@tanstack/react-query';

import {
    getTestRunsListQueryKey,
    testRunsList,
} from '@/api/generated/endpoints/test-runs/test-runs';
import type { ListTestRunsResponseDtoItemsItem } from '@/api/generated/model';

export const HISTORY_PAGE_SIZE = 30;
export const HISTORY_TYPES = ['single', 'scenario'] as const;

export type HistoryType = (typeof HISTORY_TYPES)[number];
export type RunListItem = ListTestRunsResponseDtoItemsItem;

export const historyQuery = (type: HistoryType | undefined) =>
    infiniteQueryOptions({
        queryKey: [...getTestRunsListQueryKey({ limit: HISTORY_PAGE_SIZE, type }), 'pages'],
        queryFn: ({ pageParam, signal }) =>
            testRunsList(
                { limit: HISTORY_PAGE_SIZE, type, ...(pageParam ? { cursor: pageParam } : {}) },
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
