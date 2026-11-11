import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { toastManager } from '@/components/ui/toast';
import { coreError } from '@/mocks/core-error';
import { server } from '@/mocks/server';
import { FakeEventSource } from '@/test/fake-event-source';

import { type TestRunControlsOptions, useTestRunControls } from './use-test-run-controls';

const RUN_ID = '7c2a1f3e-9b4d-4e6a-8f1c-2d3b4a5c6e7f';

const target = { method: 'POST' as const, url: 'https://api.dev/tasks' };

function setup(options: Partial<TestRunControlsOptions> = {}) {
    const onRunStarted = vi.fn<(runId: string) => void>();
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    function wrapper({ children }: { children: ReactNode }) {
        return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    }
    const hook = renderHook(
        () => useTestRunControls({ target, body: '', runId: undefined, onRunStarted, ...options }),
        { wrapper },
    );
    return { ...hook, onRunStarted };
}

afterEach(() => vi.restoreAllMocks());

describe('useTestRunControls', () => {
    it('blocks Start until a route is picked', () => {
        const { result } = setup({ target: null });
        expect(result.current.block).toEqual({ kind: 'noTarget' });
    });

    it('blocks Start while the URL has an unfilled path parameter', () => {
        const { result } = setup({ target: { method: 'GET', url: 'https://api.dev/tasks/{id}' } });
        expect(result.current.block).toEqual({ kind: 'pathParam', param: '{id}' });
    });

    it('blocks Start until a secret hidden by a past run is re-entered', () => {
        const { result } = setup({
            target: { ...target, headers: { Authorization: 'Bearer ***' } },
        });
        expect(result.current.block).toEqual({ kind: 'maskedSecret', name: 'Authorization' });
    });

    it('starts from the settings it is given', () => {
        const initialConfig = { targetRps: 250, durationSeconds: 30, rampUpSeconds: 5 };
        const { result } = setup({ initialConfig });
        expect(result.current.config).toEqual(initialConfig);
    });

    it('blocks Start while the body is invalid', () => {
        const { result } = setup({ body: '{"title": ' });
        expect(result.current.block).toEqual({ kind: 'invalidBody' });
    });

    it('starts a single run with the config and body', async () => {
        let sent: unknown = null;
        server.use(
            http.post('*/v1/test-runs', async ({ request }) => {
                sent = await request.json();
                return HttpResponse.json({ id: RUN_ID, status: 'PENDING' }, { status: 201 });
            }),
        );
        const { result, onRunStarted } = setup({ body: '{"title": "{{$uuid}}"}' });
        act(() => result.current.start());
        await waitFor(() => expect(onRunStarted).toHaveBeenCalledWith(RUN_ID));
        expect(sent).toEqual({
            type: 'single',
            config: {
                target: { ...target, body: '{"title": "{{$uuid}}"}' },
                targetRps: 100,
                durationSeconds: 60,
                rampUpSeconds: 0,
            },
        });
    });

    it('explains when another test is already running', async () => {
        const add = vi.spyOn(toastManager, 'add');
        server.use(
            http.post('*/v1/test-runs', () =>
                coreError(
                    503,
                    'TEST_RUN.CAPACITY_EXCEEDED',
                    'Too many test runs are in progress, try again later',
                ),
            ),
        );
        const { result, onRunStarted } = setup();
        act(() => result.current.start());
        await waitFor(() =>
            expect(add).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'error',
                    description: 'Another test is running, try again shortly.',
                }),
            ),
        );
        expect(onRunStarted).not.toHaveBeenCalled();
    });

    it('follows the run through the live stream and stops it', async () => {
        let stopped = false;
        server.use(
            http.post('*/v1/test-runs/:id/stop', () => {
                stopped = true;
                return HttpResponse.json({ id: RUN_ID, status: 'RUNNING' }, { status: 202 });
            }),
        );
        const { result } = setup({ runId: RUN_ID });
        expect(result.current.phase).toBe('running');

        const source = FakeEventSource.latest();
        act(() => source.emit('status', { status: 'RUNNING' }));
        expect(result.current.phase).toBe('running');

        act(() => result.current.stop());
        await waitFor(() => expect(stopped).toBe(true));
        expect(result.current.phase).toBe('stopping');

        act(() => source.emit('status', { status: 'STOPPED' }));
        expect(result.current.phase).toBe('idle');
        expect(result.current.live.status).toBe('STOPPED');
    });

    it('reuses the idempotency key after a lost reply, and not after a success', async () => {
        const keys: (string | null)[] = [];
        let calls = 0;
        server.use(
            http.post('*/v1/test-runs', ({ request }) => {
                keys.push(request.headers.get('Idempotency-Key'));
                calls += 1;
                if (calls === 1) {
                    return HttpResponse.error();
                }
                return HttpResponse.json({ id: RUN_ID, status: 'PENDING' }, { status: 201 });
            }),
        );
        vi.spyOn(toastManager, 'add');
        const { result, onRunStarted } = setup();

        act(() => result.current.start());
        await waitFor(() => expect(keys).toHaveLength(1));
        await waitFor(() => expect(result.current.phase).toBe('idle'));

        act(() => result.current.start());
        await waitFor(() => expect(onRunStarted).toHaveBeenCalledWith(RUN_ID));
        expect(keys[0]).toMatch(/^[\da-f-]{36}$/);
        expect(keys[1]).toBe(keys[0]);

        act(() => result.current.start());
        await waitFor(() => expect(keys).toHaveLength(3));
        expect(keys[2]).not.toBe(keys[0]);
    });

    it('uses a new key when the config changes after a failed start', async () => {
        const keys: (string | null)[] = [];
        server.use(
            http.post('*/v1/test-runs', ({ request }) => {
                keys.push(request.headers.get('Idempotency-Key'));
                return HttpResponse.error();
            }),
        );
        vi.spyOn(toastManager, 'add');
        const { result } = setup();

        act(() => result.current.start());
        await waitFor(() => expect(keys).toHaveLength(1));
        await waitFor(() => expect(result.current.phase).toBe('idle'));

        act(() => result.current.setConfig({ ...result.current.config, targetRps: 250 }));
        act(() => result.current.start());
        await waitFor(() => expect(keys).toHaveLength(2));
        expect(keys[1]).not.toBe(keys[0]);
    });

    it('retries once with a fresh key when core says the key was reused', async () => {
        const keys: (string | null)[] = [];
        server.use(
            http.post('*/v1/test-runs', ({ request }) => {
                keys.push(request.headers.get('Idempotency-Key'));
                return keys.length === 1
                    ? coreError(
                          422,
                          'TEST_RUN.IDEMPOTENCY_KEY_REUSED',
                          'This idempotency key was already used for a different test config',
                      )
                    : HttpResponse.json({ id: RUN_ID, status: 'PENDING' }, { status: 201 });
            }),
        );
        const { result, onRunStarted } = setup();

        act(() => result.current.start());
        await waitFor(() => expect(onRunStarted).toHaveBeenCalledWith(RUN_ID));
        expect(keys).toHaveLength(2);
        expect(keys[1]).not.toBe(keys[0]);
    });
});
