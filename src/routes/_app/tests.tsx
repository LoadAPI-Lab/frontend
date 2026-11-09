import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';

import { ApiError } from '@/api/fetcher';
import { apiSpecQuery } from '@/features/collections';
import { StressTestPage } from '@/features/stress-tests';
import { rememberTestsSearch, testsSearchSchema } from '@/lib/last-tests-search';
import { rememberRun } from '@/lib/run-memory';

export const Route = createFileRoute('/_app/tests')({
    validateSearch: testsSearchSchema,
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
        useEffect(() => {
            rememberTestsSearch({ spec: specId, endpoint: endpointKey, run });
        }, [specId, endpointKey, run]);
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
                    if (specId && endpointKey) {
                        rememberRun(id, { spec: specId, endpoint: endpointKey });
                    }
                    void navigate({ search: (previous) => ({ ...previous, run: id }) });
                }}
            />
        );
    },
});
