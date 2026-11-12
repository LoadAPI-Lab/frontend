import { useMutation } from '@tanstack/react-query';
import { useRef } from 'react';

import { ApiError, errorCode } from '@/api/fetcher';
import { requestsSend } from '@/api/generated/endpoints/requests/requests';
import type { SendRequestDto } from '@/api/generated/model';

import { type RequestBlock, requestBlock } from './request-block';
import type { RunTarget } from './use-test-run-controls';

export type SendBlock = RequestBlock | { kind: 'bodyNotAllowed'; method: string };

export type SendProblem =
    | { kind: 'targetNotAllowed' }
    | { kind: 'rateLimited' }
    | { kind: 'failed'; message: string };

export const TARGET_NOT_ALLOWED = 'REQUEST.TARGET_NOT_ALLOWED';

const NO_BODY_METHODS = new Set(['GET', 'HEAD']);

export function sendBlock(target: RunTarget | null, body: string): SendBlock | null {
    const block = requestBlock(target, body);
    if (block) {
        return block;
    }
    if (target && body.trim() !== '' && NO_BODY_METHODS.has(target.method)) {
        return { kind: 'bodyNotAllowed', method: target.method };
    }
    return null;
}

export function sendProblem(error: Error): SendProblem {
    if (errorCode(error) === TARGET_NOT_ALLOWED) {
        return { kind: 'targetNotAllowed' };
    }
    if (error instanceof ApiError && error.status === 429) {
        return { kind: 'rateLimited' };
    }
    return { kind: 'failed', message: error.message };
}

interface SendAttempt {
    data: SendRequestDto;
    signal: AbortSignal;
}

export interface SendRequestOptions {
    target: RunTarget | null;
    body: string;
    onSend?: () => void;
}

export function useSendRequest({ target, body, onSend }: SendRequestOptions) {
    const block = sendBlock(target, body);
    const controller = useRef<AbortController | null>(null);
    const mutation = useMutation({
        mutationFn: ({ data, signal }: SendAttempt) => requestsSend(data, { signal }),
        meta: { toastOnError: false },
    });

    return {
        block,
        sending: mutation.isPending,
        outcome: mutation.data ?? null,
        problem: mutation.error ? sendProblem(mutation.error) : null,
        send: () => {
            if (block || !target) {
                return;
            }
            controller.current?.abort();
            const next = new AbortController();
            controller.current = next;
            const data = body.trim() === '' ? target : { ...target, body };
            onSend?.();
            mutation.mutate({ data, signal: next.signal });
        },
        cancel: () => {
            controller.current?.abort();
            controller.current = null;
            mutation.reset();
        },
    };
}
