import { config } from '@/config';

export class ApiError<Body = unknown> extends Error {
    constructor(
        readonly status: number,
        message: string,
        readonly requestId: string | null,
        readonly body: Body,
    ) {
        super(message);
        this.name = 'ApiError';
    }
}

async function parseBody(response: Response): Promise<unknown> {
    if (response.status === 204) {
        return null;
    }
    const type = response.headers.get('content-type') ?? '';
    return type.includes('application/json') ? response.json() : response.text();
}

function messageFrom(body: unknown, fallback: string): string {
    if (body && typeof body === 'object' && 'message' in body) {
        const { message } = body;
        if (typeof message === 'string') {
            return message;
        }
        if (Array.isArray(message)) {
            return message.join(', ');
        }
    }
    return fallback || 'Request failed';
}

const NO_REFRESH_PREFIXES = ['/v1/auth/', '/v1/oauth/'];

function buildRequest(path: string, init: RequestInit): [URL, RequestInit] {
    const headers = new Headers(init.headers);
    headers.set('accept', 'application/json');
    headers.set('x-requested-with', 'XMLHttpRequest');
    if (init.body && !(init.body instanceof FormData) && !headers.has('content-type')) {
        headers.set('content-type', 'application/json');
    }
    const url = new URL(`${config.apiBase}${path}`, window.location.origin);
    return [url, { ...init, headers, credentials: 'same-origin' }];
}

let refreshing: Promise<boolean> | null = null;

export function refreshSession(): Promise<boolean> {
    refreshing ??= fetch(...buildRequest('/v1/auth/refresh', { method: 'POST' }))
        .then(
            (response) => response.ok,
            () => false,
        )
        .finally(() => {
            refreshing = null;
        });
    return refreshing;
}

export async function apiFetch<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
    let response = await fetch(...buildRequest(path, init));

    if (
        response.status === 401 &&
        !NO_REFRESH_PREFIXES.some((prefix) => path.startsWith(prefix)) &&
        (await refreshSession())
    ) {
        response = await fetch(...buildRequest(path, init));
    }

    const body = await parseBody(response);
    if (!response.ok) {
        throw new ApiError(
            response.status,
            messageFrom(body, response.statusText),
            response.headers.get('x-request-id'),
            body,
        );
    }
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    return body as T;
}

export function errorCode(error: unknown): string | undefined {
    if (
        error instanceof ApiError &&
        error.body &&
        typeof error.body === 'object' &&
        'code' in error.body &&
        typeof error.body.code === 'string'
    ) {
        return error.body.code;
    }
    return undefined;
}

export function isUnauthorized(error: unknown): error is ApiError {
    return error instanceof ApiError && error.status === 401;
}

export type ErrorType<Body> = ApiError<Body>;

export function orvalFetch<T>(url: string, init?: RequestInit): Promise<T> {
    return apiFetch<T>(url, init);
}
