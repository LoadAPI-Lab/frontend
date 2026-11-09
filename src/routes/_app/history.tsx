import { createFileRoute } from '@tanstack/react-router';
import { useCallback } from 'react';
import { z } from 'zod';

import { HISTORY_TYPES, HistoryPage } from '@/features/history';

export const Route = createFileRoute('/_app/history')({
    validateSearch: z.object({
        type: z.enum(HISTORY_TYPES).optional(),
        run: z.string().optional(),
    }),
    component: function HistoryRoute() {
        const { type, run } = Route.useSearch();
        const navigate = Route.useNavigate();
        const onRunChange = useCallback(
            (id: string) => {
                void navigate({ search: (previous) => ({ ...previous, run: id }), replace: true });
            },
            [navigate],
        );
        return (
            <HistoryPage
                type={type}
                runId={run}
                onTypeChange={(next) => {
                    void navigate({ search: { type: next } });
                }}
                onRunChange={onRunChange}
            />
        );
    },
});
