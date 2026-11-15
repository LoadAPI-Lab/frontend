import { http, HttpResponse } from 'msw';
import { z } from 'zod';

import type { SendRequestResponseDto } from '@/api/generated/model';

import { coreError } from './core-error';

const sendSchema = z.object({
    method: z.string(),
    url: z.string(),
    headers: z.record(z.string(), z.string()).optional(),
    body: z.string().optional(),
});

export const MOCK_REFUSED_PATH = '/refused';
export const MOCK_BINARY_PATH = '/binary';
export const MOCK_PRIVATE_HOST = '10.0.0.1';

const STATUS_PATH = /\/status\/(\d{3})(?:[/?#]|$)/;

const encoder = new TextEncoder();

export const MOCK_ACCESS_TOKEN = 'mock-access-token';
export const MOCK_TASK_ID = 'task-42';

const TASK = {
    id: MOCK_TASK_ID,
    title: 'Write the report',
    status: 'todo',
    tags: ['diploma', 'frontend'],
    owner: { id: 'user-7', email: 'demo@example.com' },
};

function testServerBody(method: string, url: string): unknown {
    const { hostname, pathname } = new URL(url);
    if (hostname !== 'testserver') {
        return undefined;
    }
    if (method === 'POST' && pathname === '/auth/login') {
        return { accessToken: MOCK_ACCESS_TOKEN, tokenType: 'Bearer', expiresIn: 3600 };
    }
    if (method === 'POST' && pathname === '/tasks') {
        return { data: TASK };
    }
    if (method === 'GET' && pathname.startsWith('/tasks/')) {
        return { data: { ...TASK, id: pathname.slice('/tasks/'.length) } };
    }
    if (method === 'GET' && pathname === '/tasks') {
        return { items: [TASK], total: 1 };
    }
    return undefined;
}

function respond(method: string, url: string, body?: string): SendRequestResponseDto {
    if (url.includes(MOCK_REFUSED_PATH)) {
        return {
            kind: 'error',
            durationMs: 3.2,
            error: {
                category: 'connection_refused',
                message: 'The target refused the connection',
            },
        };
    }
    if (url.includes(MOCK_BINARY_PATH)) {
        return {
            kind: 'response',
            status: 200,
            statusText: 'OK',
            headers: [{ name: 'content-type', value: 'image/png' }],
            binary: true,
            sizeBytes: 20_480,
            durationMs: 61.4,
        };
    }
    const status = Number(STATUS_PATH.exec(url)?.[1] ?? 200);
    const known = testServerBody(method, url);
    const text = JSON.stringify(known ?? { method, url, ...(body ? { received: body } : {}) });
    return {
        kind: 'response',
        status,
        ...(status === 200 ? { statusText: 'OK' } : {}),
        headers: [
            { name: 'content-type', value: 'application/json; charset=utf-8' },
            { name: 'set-cookie', value: 'session=abc; Path=/; HttpOnly' },
            { name: 'set-cookie', value: 'theme=dark; Path=/' },
        ],
        body: text,
        sizeBytes: encoder.encode(text).length,
        durationMs: 48.7,
    };
}

export const requestHandlers = [
    http.post('*/v1/requests', async ({ request }) => {
        const parsed = sendSchema.safeParse(await request.json());
        if (!parsed.success) {
            return coreError(400, 'VALIDATION_ERROR', 'The request failed validation');
        }
        const { method, url, body } = parsed.data;
        if (new URL(url).hostname === MOCK_PRIVATE_HOST) {
            return coreError(
                400,
                'REQUEST.TARGET_NOT_ALLOWED',
                'The target address is not allowed',
            );
        }
        return HttpResponse.json(respond(method, url, body));
    }),
];
