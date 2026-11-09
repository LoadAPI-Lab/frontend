import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
    createMemoryHistory,
    createRootRoute,
    createRouter,
    RouterProvider,
} from '@tanstack/react-router';
import { render, screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { server } from '@/mocks/server';

import { RecentRunsCard } from './recent-runs-card';

const hoursAgo = (hours: number) => new Date(Date.now() - hours * 3_600_000).toISOString();

function serve(items: unknown[]) {
    server.use(http.get('*/v1/test-runs', () => HttpResponse.json({ items })));
}

function renderCard() {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const router = createRouter({
        routeTree: createRootRoute({
            component: () => (
                <QueryClientProvider client={client}>
                    <RecentRunsCard />
                </QueryClientProvider>
            ),
        }),
        history: createMemoryHistory({ initialEntries: ['/tests'] }),
    });
    render(<RouterProvider router={router} />);
}

describe('RecentRunsCard', () => {
    it('lists the latest runs with their p95 and links to History', async () => {
        serve([
            {
                id: 'run-1',
                type: 'single',
                status: 'COMPLETED',
                createdAt: hoursAgo(2),
                request: { method: 'GET', url: 'http://testserver:8080/api/tasks' },
                targetRps: 500,
                durationSeconds: 30,
                p95Ms: 64,
            },
            {
                id: 'run-2',
                type: 'single',
                status: 'RUNNING',
                createdAt: hoursAgo(0),
                request: { method: 'POST', url: 'http://testserver:8080/api/users' },
                targetRps: 200,
                durationSeconds: 60,
            },
        ]);
        renderCard();

        const card = await screen.findByRole('region', { name: 'Recent runs' });
        const done = await within(card).findByRole('link', { name: /\/api\/tasks/ });
        expect(done).toHaveTextContent('500 RPS · 30s');
        expect(done).toHaveTextContent('p95 64ms');
        expect(done).toHaveAttribute('href', '/history?run=run-1');
        expect(within(card).getByRole('link', { name: /\/api\/users/ })).toHaveTextContent(
            'Running',
        );
        expect(within(card).getByRole('link', { name: 'View all' })).toHaveAttribute(
            'href',
            '/history',
        );
    });

    it('says when there are no runs yet', async () => {
        serve([]);
        renderCard();
        expect(await screen.findByText(/No runs yet/)).toBeVisible();
    });
});
