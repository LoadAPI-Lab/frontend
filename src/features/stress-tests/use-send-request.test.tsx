import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/api/fetcher';
import { coreError } from '@/mocks/core-error';
import { server } from '@/mocks/server';

import {
    type SendRequestOptions,
    sendBlock,
    sendProblem,
    TARGET_NOT_ALLOWED,
    useSendRequest,
} from './use-send-request';

const target = { method: 'POST' as const, url: 'https://api.dev/tasks' };

function setup(options: Partial<SendRequestOptions> = {}) {
    const onSend = vi.fn<() => void>();
    const client = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    function wrapper({ children }: { children: ReactNode }) {
        return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    }
    const hook = renderHook(() => useSendRequest({ target, body: '', onSend, ...options }), {
        wrapper,
    });
    return { ...hook, onSend };
}

describe('sendBlock', () => {
    it('uses the same checks as Start', () => {
        expect(sendBlock(null, '')).toEqual({ kind: 'noTarget' });
        expect(sendBlock({ method: 'GET', url: '/tasks' }, '')).toEqual({ kind: 'noServer' });
        expect(sendBlock(target, '{"title": ')).toEqual({ kind: 'invalidBody' });
    });

    it('blocks a body on GET and HEAD', () => {
        expect(sendBlock({ method: 'GET', url: 'https://api.dev' }, '{}')).toEqual({
            kind: 'bodyNotAllowed',
            method: 'GET',
        });
        expect(sendBlock({ method: 'HEAD', url: 'https://api.dev' }, ' ')).toBeNull();
        expect(sendBlock(target, '{}')).toBeNull();
    });
});

describe('sendProblem', () => {
    it('names the errors core sends back', () => {
        expect(sendProblem(new ApiError(400, 'no', null, null, TARGET_NOT_ALLOWED))).toEqual({
            kind: 'targetNotAllowed',
        });
        expect(sendProblem(new ApiError(429, 'slow down', null, null))).toEqual({
            kind: 'rateLimited',
        });
        expect(sendProblem(new Error('offline'))).toEqual({ kind: 'failed', message: 'offline' });
    });
});

describe('useSendRequest', () => {
    it('sends the request with its body and returns the response', async () => {
        let sent: unknown = null;
        server.use(
            http.post('*/v1/requests', async ({ request }) => {
                sent = await request.json();
                return HttpResponse.json({
                    kind: 'response',
                    status: 201,
                    headers: [],
                    body: '{}',
                    sizeBytes: 2,
                    durationMs: 12,
                });
            }),
        );
        const { result, onSend } = setup({ body: '{"title": "x"}' });
        act(() => result.current.send());
        expect(onSend).toHaveBeenCalledOnce();
        await waitFor(() => expect(result.current.outcome).not.toBeNull());
        expect(sent).toEqual({ ...target, body: '{"title": "x"}' });
        expect(result.current.outcome).toMatchObject({ kind: 'response', status: 201 });
        expect(result.current.problem).toBeNull();
    });

    it('leaves the body out when it is empty', async () => {
        let sent: unknown = null;
        server.use(
            http.post('*/v1/requests', async ({ request }) => {
                sent = await request.json();
                return HttpResponse.json({
                    kind: 'error',
                    durationMs: 1,
                    error: { category: 'dns', message: 'DNS lookup failed' },
                });
            }),
        );
        const { result } = setup();
        act(() => result.current.send());
        await waitFor(() => expect(result.current.outcome?.kind).toBe('error'));
        expect(sent).toEqual(target);
    });

    it('reports a blocked target', async () => {
        server.use(
            http.post('*/v1/requests', () =>
                coreError(400, TARGET_NOT_ALLOWED, 'The target address is not allowed'),
            ),
        );
        const { result } = setup();
        act(() => result.current.send());
        await waitFor(() => expect(result.current.problem).toEqual({ kind: 'targetNotAllowed' }));
    });

    it('does nothing while blocked', () => {
        const { result, onSend } = setup({ target: null });
        act(() => result.current.send());
        expect(onSend).not.toHaveBeenCalled();
        expect(result.current.sending).toBe(false);
    });

    it('cancel stops waiting and clears the result', async () => {
        server.use(
            http.post('*/v1/requests', async () => {
                await delay('infinite');
                return HttpResponse.json({});
            }),
        );
        const { result } = setup();
        act(() => result.current.send());
        await waitFor(() => expect(result.current.sending).toBe(true));
        act(() => result.current.cancel());
        await waitFor(() => expect(result.current.sending).toBe(false));
        expect(result.current.outcome).toBeNull();
        expect(result.current.problem).toBeNull();
    });
});
