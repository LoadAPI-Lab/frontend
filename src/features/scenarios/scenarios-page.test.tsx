import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
    createMemoryHistory,
    createRootRoute,
    createRouter,
    RouterProvider,
} from '@tanstack/react-router';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { pickStep } from '@/lib/step-seed';
import { taskLifecycleScenario } from '@/mocks/scenarios';
import { server } from '@/mocks/server';
import { mockScenarioResult } from '@/mocks/test-runs';
import { FakeEventSource } from '@/test/fake-event-source';

import { resetScenarioStore } from './scenario-store';
import { ScenariosPage } from './scenarios-page';
import { resetStepSends } from './use-step-sends';

function StatefulPage({
    initial,
    onOpen,
}: {
    initial?: string;
    onOpen: (scenario?: string) => void;
}) {
    const [scenario, setScenario] = useState(initial);
    return (
        <ScenariosPage
            scenario={scenario}
            onOpen={(next) => {
                onOpen(next);
                setScenario(next);
            }}
        />
    );
}

function renderPage(initial?: string) {
    resetScenarioStore();
    resetStepSends();
    const onOpen = vi.fn<(scenario?: string) => void>();
    const client = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const router = createRouter({
        routeTree: createRootRoute({
            component: () => (
                <QueryClientProvider client={client}>
                    <StatefulPage
                        initial={initial}
                        onOpen={onOpen}
                    />
                </QueryClientProvider>
            ),
        }),
        history: createMemoryHistory({ initialEntries: ['/scenarios'] }),
    });
    render(<RouterProvider router={router} />);
    return { onOpen, user: userEvent.setup() };
}

const steps = () => screen.getAllByRole('article', { name: /^Step \d+/ });
const stepAt = (index: number) => {
    const step = steps()[index];
    if (!step) {
        throw new Error(`No step ${index + 1}`);
    }
    return step;
};
const runButton = () => screen.getByRole('button', { name: 'Run scenario' });

describe('ScenariosPage', () => {
    it('opens the first saved scenario with its steps and variables', async () => {
        renderPage();

        expect(await screen.findByRole('textbox', { name: 'Scenario name' })).toHaveValue(
            'Task lifecycle',
        );
        expect(steps()).toHaveLength(4);
        expect(screen.getByRole('link', { name: 'Task lifecycle' })).toHaveAttribute(
            'aria-current',
            'page',
        );
        const variables = screen.getByRole('table');
        expect(within(variables).getByText('token')).toBeInTheDocument();
        expect(within(variables).getByText('data.id')).toBeInTheDocument();
        expect(runButton()).toBeEnabled();
    });

    it('flags a step that uses a variable no earlier step extracts', async () => {
        const { user } = renderPage('new');

        await user.click(await screen.findByRole('button', { name: 'Add a blank step' }));
        expect(
            screen.getByText('Enter a full URL starting with http:// or https://.'),
        ).toBeVisible();
        await user.click(screen.getByRole('textbox', { name: 'Step 1 URL' }));
        await user.paste('http://testserver:8080/tasks/{{taskId}}');

        expect(screen.getByText('Uses {{taskId}}, but no earlier step extracts it.')).toBeVisible();
        expect(runButton()).toBeDisabled();
        expect(screen.getByText('Fix 1 problem in the steps to run or save.')).toBeVisible();
        expect(screen.getByText('used before any step extracts it')).toBeInTheDocument();
    });

    it('adds a route picked in the sidebar as a step', async () => {
        renderPage();
        await screen.findByRole('textbox', { name: 'Scenario name' });

        act(() => pickStep({ method: 'GET', url: 'http://testserver:8080/fixed' }));

        expect(steps()).toHaveLength(5);
        expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
        expect(screen.getByRole('status')).toHaveTextContent(
            'Step 5 added: GET http://testserver:8080/fixed',
        );
    });

    it('runs the scenario linked to its saved id and shows each step result', async () => {
        const starts: unknown[] = [];
        server.use(
            http.post('*/v1/test-runs', async ({ request }) => {
                starts.push(await request.clone().json());
            }),
        );
        const { user } = renderPage();
        await screen.findByRole('textbox', { name: 'Scenario name' });

        await user.click(runButton());
        await vi.waitFor(() =>
            expect(starts).toEqual([
                expect.objectContaining({
                    type: 'scenario',
                    scenarioId: taskLifecycleScenario.id,
                }),
            ]),
        );
        const source = await vi.waitFor(() => FakeEventSource.latest());
        act(() => source.emit('status', { status: 'RUNNING' }));
        expect(await screen.findByRole('button', { name: 'Stop' })).toBeEnabled();
        server.use(
            http.get('*/v1/test-runs/:id', ({ params }) =>
                HttpResponse.json({
                    id: params.id,
                    type: 'scenario',
                    status: 'COMPLETED',
                    createdAt: new Date().toISOString(),
                    finishedAt: new Date().toISOString(),
                    config: taskLifecycleScenario.config,
                    result: mockScenarioResult(taskLifecycleScenario.config.steps),
                }),
            ),
        );
        act(() => source.emit('status', { status: 'COMPLETED' }));

        expect(await screen.findByText('4/4')).toBeInTheDocument();
        expect(screen.getByText('steps passed')).toBeInTheDocument();
        const lastRun = screen.getByRole('region', { name: 'Last run' });
        expect(within(lastRun).getAllByRole('listitem')).toHaveLength(4);
        expect(within(lastRun).getAllByText('201')).toHaveLength(2);
        expect(within(lastRun).getByText('204')).toBeInTheDocument();
    });

    it('saves a new scenario and opens it', async () => {
        const { user, onOpen } = renderPage('new');
        await screen.findByRole('button', { name: 'Add a blank step' });

        act(() => pickStep({ method: 'GET', url: 'http://testserver:8080/fixed' }));
        await user.click(screen.getByRole('button', { name: 'Save' }));
        expect(screen.getByRole('textbox', { name: 'Scenario name' })).toHaveFocus();

        await user.type(screen.getByRole('textbox', { name: 'Scenario name' }), 'Smoke');
        await user.click(screen.getByRole('button', { name: 'Save' }));

        await vi.waitFor(() => expect(onOpen).toHaveBeenCalledWith(expect.any(String)));
        expect(onOpen.mock.calls[0]?.[0]).not.toBe(taskLifecycleScenario.id);
        expect(await screen.findByRole('link', { name: 'Smoke' })).toHaveAttribute(
            'aria-current',
            'page',
        );
        expect(screen.queryByText('Not saved yet')).not.toBeInTheDocument();
    });

    it('sends steps one by one and extracts a value picked from the response', async () => {
        const { user } = renderPage();
        await screen.findByRole('textbox', { name: 'Scenario name' });
        await user.click(within(stepAt(2)).getByRole('button', { name: /^GET/ }));
        expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
        expect(
            screen.getByText(
                'Needs {{taskId}}, {{token}} from earlier responses. Send from step 01 first.',
            ),
        ).toBeVisible();

        await user.click(within(stepAt(0)).getByRole('button', { name: /^POST/ }));
        await user.click(screen.getByRole('button', { name: 'Send' }));
        const response = await screen.findByRole('region', { name: 'Step 1 response' });
        expect(await within(response).findByText('200 OK')).toBeVisible();
        expect(within(response).getByText('token')).toBeVisible();

        await user.click(within(response).getByRole('button', { name: /^expiresIn/ }));
        expect(within(response).getByText('expiresIn', { selector: '.bg-accent' })).toBeVisible();
        await user.click(screen.getByRole('tab', { name: /^Extract/ }));
        expect(screen.getByRole('textbox', { name: 'Variable 2' })).toHaveValue('expiresIn');

        await user.click(within(stepAt(1)).getByRole('button', { name: /^POST/ }));
        await user.click(screen.getByRole('button', { name: 'Send' }));
        const second = await screen.findByRole('region', { name: 'Step 2 response' });
        expect(await within(second).findByText('taskId', { selector: '.bg-accent' })).toBeVisible();

        await user.click(within(stepAt(2)).getByRole('button', { name: /^GET/ }));
        expect(screen.getByRole('button', { name: 'Send' })).toBeEnabled();
    });
});
