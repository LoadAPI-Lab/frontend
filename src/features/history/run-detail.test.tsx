import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
    createMemoryHistory,
    createRootRoute,
    createRouter,
    RouterProvider,
} from '@tanstack/react-router';
import { fireEvent, render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { server } from '@/mocks/server';

import { RunDetail } from './run-detail';

const url = 'http://testserver:8080/fixed';

const result = {
    durationMs: 30_000,
    targetRps: 100,
    avgRps: 99,
    targets: [
        {
            method: 'GET',
            url,
            totalRequests: 3000,
            successCount: 3000,
            errorCount: 0,
            errorRate: 0,
            lateCount: 0,
            responseTime: { p50Ms: 40, p95Ms: 120, p99Ms: 180 },
            statusCodes: { '200': 3000 },
        },
    ],
};

const singleRun = (status: string) => ({
    id: 'run-1',
    type: 'single',
    status,
    createdAt: new Date(Date.now() - 12_000).toISOString(),
    ...(status === 'PENDING' ? {} : { startedAt: new Date(Date.now() - 12_000).toISOString() }),
    config: { target: { method: 'GET', url }, targetRps: 100, durationSeconds: 30 },
    ...(status === 'COMPLETED' || status === 'STOPPED' ? { result } : {}),
});

const scenarioRun = (status: string) => ({
    id: 'run-1',
    type: 'scenario',
    status,
    createdAt: new Date().toISOString(),
    config: { steps: [{ target: { method: 'GET', url } }] },
});

function serveRun(statuses: string[], build: (status: string) => object = singleRun) {
    let call = 0;
    server.use(
        http.get('*/v1/test-runs/:id', () => {
            const status = statuses[Math.min(call, statuses.length - 1)] ?? 'RUNNING';
            call += 1;
            return HttpResponse.json(build(status));
        }),
        http.get('*/v1/test-runs', () => HttpResponse.json({ items: [] })),
    );
}

function renderDetail() {
    const client = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const router = createRouter({
        routeTree: createRootRoute({
            component: () => (
                <QueryClientProvider client={client}>
                    <RunDetail
                        runId="run-1"
                        listItems={[]}
                    />
                </QueryClientProvider>
            ),
        }),
        history: createMemoryHistory({ initialEntries: ['/history'] }),
    });
    render(<RouterProvider router={router} />);
}

describe('RunDetail for a run in progress', () => {
    it('offers View live and Stop instead of Re-run while running', async () => {
        serveRun(['RUNNING']);
        renderDetail();

        const live = await screen.findByRole('link', { name: 'View live' });
        expect(live.getAttribute('href')).toMatch(/^\/tests\?.*run=run-1/);
        expect(screen.getByRole('button', { name: 'Stop test' })).toBeEnabled();
        expect(screen.queryByRole('button', { name: 'Re-run test' })).not.toBeInTheDocument();
        expect(screen.getByRole('region', { name: 'This run is in progress' })).toBeVisible();
        expect(screen.getByText(/^00:1\d \/ 00:30$/)).toBeVisible();
        expect(screen.queryByText('Requests sent')).not.toBeInTheDocument();
    });

    it('says it is waiting for a worker while pending', async () => {
        serveRun(['PENDING']);
        renderDetail();

        expect(
            await screen.findByRole('region', { name: 'Waiting for a worker to start this run' }),
        ).toBeVisible();
        expect(screen.getByText('00:00 / 00:30')).toBeVisible();
        expect(screen.getByRole('link', { name: 'View live' })).toBeVisible();
        expect(screen.getByRole('button', { name: 'Stop test' })).toBeVisible();
    });

    it('stops the run and switches to its results without a reload', async () => {
        const stops: string[] = [];
        serveRun(['RUNNING', 'STOPPED']);
        server.use(
            http.post('*/v1/test-runs/:id/stop', ({ params }) => {
                stops.push(String(params.id));
                return HttpResponse.json({ id: params.id, status: 'RUNNING' }, { status: 202 });
            }),
        );
        renderDetail();

        fireEvent.click(await screen.findByRole('button', { name: 'Stop test' }));

        expect(await screen.findByRole('button', { name: 'Re-run test' })).toBeEnabled();
        expect(stops).toEqual(['run-1']);
        expect(screen.getByText('Stopped')).toBeVisible();
        expect(screen.getByText('Avg RPS')).toBeVisible();
        expect(screen.queryByRole('link', { name: 'View live' })).not.toBeInTheDocument();
    });

    it('moves to the results summary when the run finishes', async () => {
        serveRun(['RUNNING', 'COMPLETED']);
        renderDetail();

        expect(await screen.findByRole('link', { name: 'View live' })).toBeVisible();
        expect(
            await screen.findByRole('button', { name: 'Re-run test' }, { timeout: 4000 }),
        ).toBeEnabled();
        expect(screen.getByText('Completed')).toBeVisible();
        expect(screen.getByText('Requests sent')).toBeVisible();
        expect(screen.queryByRole('button', { name: 'Stop test' })).not.toBeInTheDocument();
        expect(
            screen.queryByRole('region', { name: 'This run is in progress' }),
        ).not.toBeInTheDocument();
    });

    it('keeps a finished run unchanged', async () => {
        serveRun(['COMPLETED']);
        renderDetail();

        expect(await screen.findByRole('button', { name: 'Re-run test' })).toBeEnabled();
        expect(screen.queryByRole('link', { name: 'View live' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Stop test' })).not.toBeInTheDocument();
    });

    it('lets a running scenario be stopped and hides its Re-run', async () => {
        serveRun(['RUNNING'], scenarioRun);
        renderDetail();

        expect(await screen.findByRole('button', { name: 'Stop test' })).toBeEnabled();
        expect(screen.queryByRole('button', { name: 'Re-run scenario' })).not.toBeInTheDocument();
        expect(screen.queryByRole('link', { name: 'View live' })).not.toBeInTheDocument();
    });
});
