import { useSuspenseQuery } from '@tanstack/react-query';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';

import { coreError } from '@/mocks/core-error';
import { server } from '@/mocks/server';
import { renderWithProviders } from '@/test/render';

import { apiFetch } from './fetcher';
import { QueryBoundary } from './query-boundary';

function Runs() {
    const { data } = useSuspenseQuery({
        queryKey: ['runs'],
        queryFn: () => apiFetch<{ count: number }>('/v1/test-runs'),
    });
    return <p>{data.count} runs</p>;
}

function renderBoundary() {
    return renderWithProviders(
        <QueryBoundary loadingLabel="Loading runs">
            <Runs />
        </QueryBoundary>,
    );
}

describe('QueryBoundary', () => {
    it('shows the loading region, then the content', async () => {
        server.use(http.get('*/v1/test-runs', () => HttpResponse.json({ count: 3 })));
        renderBoundary();
        expect(screen.getByRole('status', { name: 'Loading runs' })).toBeInTheDocument();
        expect(await screen.findByText('3 runs')).toBeInTheDocument();
    });

    it('shows core’s message and request ID, and retry refetches', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        let calls = 0;
        server.use(
            http.get('*/v1/test-runs', () => {
                calls += 1;
                return calls === 1
                    ? coreError(
                          503,
                          'TEST_RUN.ENQUEUE_FAILED',
                          'Failed to enqueue the test job',
                          'req_42',
                      )
                    : HttpResponse.json({ count: 1 });
            }),
        );
        renderBoundary();
        const alert = await screen.findByRole('alert');
        expect(alert).toHaveTextContent('Failed to enqueue the test job');
        expect(alert).toHaveTextContent('Request ID: req_42');

        await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
        expect(await screen.findByText('1 runs')).toBeInTheDocument();
    });
});
