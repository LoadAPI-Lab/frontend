import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
    createMemoryHistory,
    createRootRoute,
    createRouter,
    RouterProvider,
} from '@tanstack/react-router';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';

import { server } from '@/mocks/server';

import { HistoryPage } from './history-page';

const today = new Date();
const at = (hoursAgo: number) => new Date(today.getTime() - hoursAgo * 3_600_000).toISOString();

const url = 'http://testserver:8080/fixed';

const listItem = (id: string, hoursAgo: number, p95Ms: number) => ({
    id,
    type: 'single',
    status: 'COMPLETED',
    createdAt: at(hoursAgo),
    request: { method: 'GET', url },
    targetRps: 100,
    durationSeconds: 10,
    p95Ms,
});

const detail = (id: string, avgRps: number, p95Ms: number, errors: number) => ({
    id,
    type: 'single',
    status: 'COMPLETED',
    createdAt: at(0),
    config: { target: { method: 'GET', url }, targetRps: 100, durationSeconds: 10 },
    result: {
        durationMs: 10_000,
        targetRps: 100,
        avgRps,
        targets: [
            {
                method: 'GET',
                url,
                totalRequests: 1000,
                successCount: 1000 - errors,
                errorCount: errors,
                errorRate: errors / 1000,
                lateCount: 0,
                responseTime: { p50Ms: 40, p95Ms, p99Ms: p95Ms + 60 },
                statusCodes: { '200': 1000 - errors, '503': errors },
            },
        ],
    },
});

function serve(items: unknown[]) {
    server.use(
        http.get('*/v1/test-runs', () => HttpResponse.json({ items })),
        http.get('*/v1/test-runs/:id', ({ params }) =>
            HttpResponse.json(
                params.id === 'run-new'
                    ? detail('run-new', 99.5, 120, 4)
                    : detail('run-old', 98, 130, 2),
            ),
        ),
    );
}

function renderPage(runId?: string, onRunChange = vi.fn<(id: string) => void>()) {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const router = createRouter({
        routeTree: createRootRoute({
            component: () => (
                <QueryClientProvider client={client}>
                    <HistoryPage
                        type={undefined}
                        runId={runId}
                        onTypeChange={vi.fn<(type: string | undefined) => void>()}
                        onRunChange={onRunChange}
                    />
                </QueryClientProvider>
            ),
        }),
        history: createMemoryHistory({ initialEntries: ['/history'] }),
    });
    render(<RouterProvider router={router} />);
    return { onRunChange };
}

describe('HistoryPage', () => {
    it('lists runs by day and shows the selected run against the previous one', async () => {
        serve([listItem('run-new', 0, 120), listItem('run-old', 0.5, 130)]);
        renderPage('run-new');

        const list = await screen.findByRole('navigation', { name: 'Test runs' });
        const todayRuns = within(list).getByRole('region', { name: /^today/i });
        expect(within(todayRuns).getAllByRole('link')).toHaveLength(2);
        expect(within(todayRuns).getAllByRole('link')[0]).toHaveTextContent('/fixed');
        expect(within(todayRuns).getAllByRole('link')[0]).toHaveAttribute('aria-current', 'true');

        expect(await screen.findByRole('heading', { name: '/fixed', level: 2 })).toBeVisible();
        expect(await screen.findByText('▲ 1.5%')).toBeVisible();
        expect(screen.getAllByText('▼ 10ms')).toHaveLength(2);
        expect(screen.getByText('= 0ms')).toBeVisible();
        expect(screen.getByText('▲ 0.2pp')).toBeVisible();

        const routeRuns =
            (await screen.findByText(/· this run$/)).closest('table') ??
            document.createElement('table');
        expect(within(routeRuns).getAllByRole('row')).toHaveLength(3);
        expect(screen.getByRole('button', { name: 'Re-run test' })).toBeEnabled();
        expect(screen.getByRole('button', { name: 'Export JSON' })).toBeEnabled();
    });

    it('selects the newest run when none is chosen', async () => {
        serve([listItem('run-new', 0, 120)]);
        const { onRunChange } = renderPage();
        await vi.waitFor(() => expect(onRunChange).toHaveBeenCalledWith('run-new'));
    });

    it('explains when there are no runs yet', async () => {
        serve([]);
        renderPage();
        expect(await screen.findByText('No test runs yet')).toBeVisible();
        expect(screen.getByRole('link', { name: 'Start a test' })).toBeVisible();
    });

    it('collapses a day and remembers it', async () => {
        serve([listItem('run-new', 0, 120)]);
        renderPage('run-new');

        const toggle = await screen.findByRole('button', { name: /^today/i });
        expect(toggle).toHaveAttribute('aria-expanded', 'true');
        fireEvent.click(toggle);

        expect(toggle).toHaveAttribute('aria-expanded', 'false');
        const list = screen.getByRole('navigation', { name: 'Test runs' });
        expect(within(list).queryByRole('link')).not.toBeInTheDocument();
        expect(window.localStorage.getItem('routelab.history.collapsed')).toBe('["today"]');
    });
});
