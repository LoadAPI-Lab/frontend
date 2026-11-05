import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

import { StressTestPage } from '@/features/stress-tests';

export const Route = createFileRoute('/_app/tests')({
    validateSearch: z.object({
        spec: z.string().optional(),
        endpoint: z.string().optional(),
        run: z.string().optional(),
    }),
    component: function TestsRoute() {
        const { run } = Route.useSearch();
        const navigate = Route.useNavigate();
        return (
            <StressTestPage
                runId={run}
                onRunStarted={(id) => {
                    void navigate({ search: (previous) => ({ ...previous, run: id }) });
                }}
            />
        );
    },
});
