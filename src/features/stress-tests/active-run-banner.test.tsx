import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
    createMemoryHistory,
    createRootRoute,
    createRouter,
    RouterProvider,
} from '@tanstack/react-router';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { rememberRun, SCRATCH_PLACE } from '@/lib/run-memory';
import { server } from '@/mocks/server';

import { ActiveRunBanner } from './active-run-banner';

const RUN_ID = '7c2a1f3e-9b4d-4e6a-8f1c-2d3b4a5c6e7f';

function serveActiveRun(onStop?: () => void) {
    let running = true;
    const listed = { count: 0 };
    server.use(
        http.get('*/v1/test-runs', () => {
            listed.count += 1;
            return HttpResponse.json({
                items: running
                    ? [
                          {
                              id: RUN_ID,
                              type: 'single',
                              status: 'RUNNING',
                              createdAt: '2026-11-08T19:00:00.000Z',
                          },
                      ]
                    : [],
            });
        }),
        http.post('*/v1/test-runs/:id/stop', () => {
            running = false;
            onStop?.();
            return HttpResponse.json({ id: RUN_ID, status: 'RUNNING' }, { status: 202 });
        }),
    );
    return listed;
}

function renderBanner(currentRunId?: string) {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const router = createRouter({
        routeTree: createRootRoute({
            component: () => (
                <QueryClientProvider client={client}>
                    <ActiveRunBanner currentRunId={currentRunId} />
                </QueryClientProvider>
            ),
        }),
        history: createMemoryHistory({ initialEntries: ['/tests'] }),
    });
    return render(<RouterProvider router={router} />);
}

describe('ActiveRunBanner', () => {
    it('links a run started from the scratch request back to it', async () => {
        serveActiveRun();
        rememberRun(RUN_ID, SCRATCH_PLACE);
        renderBanner();

        const view = await screen.findByRole('link', { name: 'View it' });
        expect(view.getAttribute('href')).toContain('scratch=1');
        expect(view.getAttribute('href')).not.toContain('spec=');
    });

    it('links to a run still going elsewhere and can stop it', async () => {
        let stopped = false;
        serveActiveRun(() => {
            stopped = true;
        });
        rememberRun(RUN_ID, { spec: 'spec-1', endpoint: 'GET /fixed' });
        renderBanner();

        const view = await screen.findByRole('link', { name: 'View it' });
        expect(view.getAttribute('href')).toContain(`run=${RUN_ID}`);
        expect(view.getAttribute('href')).toContain('spec=spec-1');

        await userEvent.click(screen.getByRole('button', { name: 'Stop it' }));
        await waitFor(() => expect(stopped).toBe(true));
        await waitFor(() =>
            expect(screen.queryByRole('link', { name: 'View it' })).not.toBeInTheDocument(),
        );
    });

    it('stays hidden while the running test is the one on screen', async () => {
        const listed = serveActiveRun();
        renderBanner(RUN_ID);
        await waitFor(() => expect(listed.count).toBeGreaterThan(0));
        expect(screen.queryByText(/still running/)).not.toBeInTheDocument();
    });
});
