import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
    createMemoryHistory,
    createRootRoute,
    createRouter,
    RouterProvider,
} from '@tanstack/react-router';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { server } from '@/mocks/server';

import { type HistoryFilters, HistoryPage } from './history-page';

const today = new Date();
const at = (hoursAgo: number) => new Date(today.getTime() - hoursAgo * 3_600_000).toISOString();

const url = 'http://testserver:8080/fixed';

const listItem = (
    id: string,
    hoursAgo: number,
    p95Ms: number,
    { path = '/fixed', status = 'COMPLETED' }: { path?: string; status?: string } = {},
) => ({
    id,
    type: 'single',
    status,
    createdAt: at(hoursAgo),
    request: { method: 'GET', url: `http://testserver:8080${path}` },
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

function serve(items: { status: string }[], requests: URL[] = []) {
    server.use(
        http.get('*/v1/test-runs', ({ request }) => {
            const requestUrl = new URL(request.url);
            requests.push(requestUrl);
            const status = requestUrl.searchParams.get('status');
            return HttpResponse.json({
                items: items.filter((item) => !status || item.status === status),
            });
        }),
        http.get('*/v1/test-runs/:id', ({ params }) =>
            HttpResponse.json(
                params.id === 'run-new'
                    ? detail('run-new', 99.5, 120, 4)
                    : detail('run-old', 98, 130, 2),
            ),
        ),
    );
}

function StatefulPage({
    runId,
    initialFilters,
    onRunChange,
    onFiltersChange,
}: {
    runId: string | undefined;
    initialFilters: HistoryFilters;
    onRunChange: (id: string) => void;
    onFiltersChange: (filters: HistoryFilters) => void;
}) {
    const [filters, setFilters] = useState(initialFilters);
    return (
        <HistoryPage
            runId={runId}
            filters={filters}
            onFiltersChange={(next) => {
                setFilters(next);
                onFiltersChange(next);
            }}
            onRunChange={onRunChange}
        />
    );
}

function renderPage(
    runId?: string,
    onRunChange = vi.fn<(id: string) => void>(),
    initialFilters: HistoryFilters = {},
) {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const onFiltersChange = vi.fn<(filters: HistoryFilters) => void>();
    const router = createRouter({
        routeTree: createRootRoute({
            component: () => (
                <QueryClientProvider client={client}>
                    <StatefulPage
                        runId={runId}
                        initialFilters={initialFilters}
                        onRunChange={onRunChange}
                        onFiltersChange={onFiltersChange}
                    />
                </QueryClientProvider>
            ),
        }),
        history: createMemoryHistory({ initialEntries: ['/history'] }),
    });
    render(<RouterProvider router={router} />);
    return { onRunChange, onFiltersChange };
}

const runLinks = () =>
    within(screen.getByRole('navigation', { name: 'Test runs' })).queryAllByRole('link');

describe('HistoryPage', () => {
    it('lists runs by day and shows the selected run against the previous one', async () => {
        serve([listItem('run-new', 0, 120), listItem('run-old', 0.5, 130)]);
        renderPage('run-new', vi.fn<(id: string) => void>(), { grouped: false });

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
        renderPage('run-new', vi.fn<(id: string) => void>(), { grouped: false });

        const toggle = await screen.findByRole('button', { name: /^today/i });
        expect(toggle).toHaveAttribute('aria-expanded', 'true');
        fireEvent.click(toggle);

        expect(toggle).toHaveAttribute('aria-expanded', 'false');
        const list = screen.getByRole('navigation', { name: 'Test runs' });
        expect(within(list).queryByRole('link')).not.toBeInTheDocument();
        expect(window.localStorage.getItem('routelab.history.collapsed')).toBe('["today"]');
    });

    it('searches loaded runs by path and shows how many match', async () => {
        serve([
            listItem('run-a', 0, 120, { path: '/status/429' }),
            listItem('run-b', 1, 130, { path: '/fixed?delay=200' }),
            listItem('run-c', 2, 140, { path: '/fixed?delay=10' }),
        ]);
        const { onFiltersChange } = renderPage('run-a', vi.fn<(id: string) => void>(), {
            grouped: false,
        });
        await screen.findByRole('navigation', { name: 'Test runs' });
        expect(screen.getByText('3 total')).toBeVisible();

        fireEvent.change(screen.getByRole('searchbox', { name: 'Search runs' }), {
            target: { value: 'delay' },
        });

        expect(runLinks()).toHaveLength(2);
        expect(screen.getByText('Showing 2')).toBeVisible();
        expect(onFiltersChange).toHaveBeenLastCalledWith({ grouped: false, query: 'delay' });
    });

    it('filters by status on the server', async () => {
        const requests: URL[] = [];
        serve(
            [listItem('run-ok', 0, 120), listItem('run-failed', 1, 130, { status: 'FAILED' })],
            requests,
        );
        renderPage('run-ok', vi.fn<(id: string) => void>(), { status: 'failed', grouped: false });

        await vi.waitFor(() => expect(runLinks()).toHaveLength(1));
        expect(requests.at(-1)?.searchParams.get('status')).toBe('FAILED');
        expect(screen.getByRole('combobox', { name: 'Status' })).toHaveTextContent('Failed');
    });

    it('explains when no runs match and clears the filters', async () => {
        serve([listItem('run-a', 0, 120)]);
        const { onFiltersChange } = renderPage('run-a', vi.fn<(id: string) => void>(), {
            query: '/nothing',
        });

        expect(await screen.findByText('No runs match')).toBeVisible();
        fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));

        expect(onFiltersChange).toHaveBeenLastCalledWith({ grouped: true });
        expect(await screen.findByRole('button', { name: /\/fixed/ })).toBeVisible();
    });

    it('groups runs by endpoint by default and expands a group to its runs', async () => {
        serve([
            listItem('run-a', 0, 120, { path: '/fixed?delay=200', status: 'FAILED' }),
            listItem('run-b', 1, 130, { path: '/fixed?delay=10' }),
            listItem('run-c', 2, 140, { path: '/status/429' }),
        ]);
        const { onFiltersChange } = renderPage('run-c');
        await screen.findByRole('navigation', { name: 'Test runs' });
        const group = screen.getByRole('button', { name: 'Group by endpoint' });
        expect(group).toHaveAttribute('aria-pressed', 'true');

        const fixed = screen.getByRole('button', { name: /\/fixed.*2 runs/ });
        expect(fixed).toHaveAttribute('aria-expanded', 'false');
        expect(fixed).toHaveTextContent('Failed');
        const status = screen.getByRole('button', { name: /\/status\/429.*1 run/ });
        expect(status).toHaveAttribute('aria-expanded', 'true');
        expect(runLinks()).toHaveLength(1);

        fireEvent.click(fixed);
        expect(fixed).toHaveAttribute('aria-expanded', 'true');
        expect(runLinks()).toHaveLength(3);

        fireEvent.click(status);
        expect(status).toHaveAttribute('aria-expanded', 'false');
        expect(runLinks()).toHaveLength(2);

        fireEvent.click(group);
        expect(onFiltersChange).toHaveBeenLastCalledWith({ grouped: false });
        expect(screen.getByRole('region', { name: /^today/i })).toBeVisible();
    });
});
