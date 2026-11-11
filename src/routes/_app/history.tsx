import { createFileRoute } from '@tanstack/react-router';
import { useCallback } from 'react';
import { z } from 'zod';

import { HISTORY_STATUSES, HISTORY_TYPES, HistoryPage } from '@/features/history';

export const Route = createFileRoute('/_app/history')({
    validateSearch: z.object({
        type: z.enum(HISTORY_TYPES).optional(),
        status: z.enum(HISTORY_STATUSES).optional(),
        q: z.string().optional(),
        group: z.enum(['endpoint', 'day']).optional(),
        run: z.string().optional(),
    }),
    component: function HistoryRoute() {
        const { type, status, q, group, run } = Route.useSearch();
        const navigate = Route.useNavigate();
        const onRunChange = useCallback(
            (id: string) => {
                void navigate({ search: (previous) => ({ ...previous, run: id }), replace: true });
            },
            [navigate],
        );
        return (
            <HistoryPage
                runId={run}
                filters={{ type, status, query: q, grouped: group !== 'day' }}
                onFiltersChange={(next, { replace }) => {
                    void navigate({
                        search: (previous) => ({
                            type: next.type,
                            status: next.status,
                            q: next.query || undefined,
                            group: next.grouped === false ? 'day' : undefined,
                            run: replace ? previous.run : undefined,
                        }),
                        replace,
                    });
                }}
                onRunChange={onRunChange}
            />
        );
    },
});
