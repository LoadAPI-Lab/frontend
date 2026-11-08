import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

import { ApiError } from '@/api/fetcher';
import { apiSpecQuery } from '@/features/collections';
import { StressTestPage } from '@/features/stress-tests';

export const Route = createFileRoute('/_app/tests')({
    validateSearch: z.object({
        spec: z.string().optional(),
        endpoint: z.string().optional(),
        run: z.string().optional(),
    }),
    loaderDeps: ({ search }) => ({ spec: search.spec }),
    loader: async ({ context, deps }) => {
        if (!deps.spec) {
            return { found: true };
        }
        try {
            await context.queryClient.ensureQueryData(apiSpecQuery(deps.spec));
            return { found: true };
        } catch (error) {
            if (error instanceof ApiError && error.status === 404) {
                return { found: false };
            }
            throw error;
        }
    },
    component: function TestsRoute() {
        const { spec: specId, endpoint: endpointKey, run } = Route.useSearch();
        const { found } = Route.useLoaderData();
        const navigate = Route.useNavigate();
        const spec = useQuery({ ...apiSpecQuery(specId ?? ''), enabled: Boolean(specId) && found });
        const endpoint = spec.data?.endpoints.find((candidate) => candidate.key === endpointKey);
        const selection = spec.data && endpoint ? { spec: spec.data, endpoint } : null;
        const missing = Boolean(specId) && (!found || (spec.isSuccess && !endpoint));

        return (
            <StressTestPage
                selection={selection}
                missing={missing}
                runId={run}
                onRunStarted={(id) => {
                    void navigate({ search: (previous) => ({ ...previous, run: id }) });
                }}
            />
        );
    },
});
