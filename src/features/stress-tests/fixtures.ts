import type { SendRequestResponseDto } from '@/api/generated/model';

export const jsonResponse: SendRequestResponseDto = {
    kind: 'response',
    status: 200,
    statusText: 'OK',
    headers: [
        { name: 'content-type', value: 'application/json; charset=utf-8' },
        { name: 'set-cookie', value: 'session=abc; Path=/; HttpOnly' },
        { name: 'set-cookie', value: 'theme=dark; Path=/' },
    ],
    body: '{"id":42,"name":"Ada"}',
    sizeBytes: 22,
    durationMs: 48.731,
};

export const notFoundResponse: SendRequestResponseDto = {
    kind: 'response',
    status: 404,
    headers: [{ name: 'content-type', value: 'text/plain' }],
    body: 'Not Found',
    sizeBytes: 9,
    durationMs: 1532.4,
};

export const binaryResponse: SendRequestResponseDto = {
    kind: 'response',
    status: 200,
    statusText: 'OK',
    headers: [{ name: 'content-type', value: 'image/png' }],
    binary: true,
    sizeBytes: 20_480,
    durationMs: 61.4,
};

export const truncatedResponse: SendRequestResponseDto = {
    ...jsonResponse,
    body: '[1,2,3',
    bodyTruncated: true,
    sizeBytes: 1_048_576,
};

export const refusedOutcome: SendRequestResponseDto = {
    kind: 'error',
    durationMs: 3.214,
    error: { category: 'connection_refused', message: 'The target refused the connection' },
};
