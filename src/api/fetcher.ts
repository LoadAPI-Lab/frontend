import { config } from '@/config';

export class ApiError extends Error {
    constructor(
        readonly status: number,
        message: string,
        readonly requestId: string | null,
        readonly body: unknown,
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

/**
 * The single place that talks HTTP to core. Paths are relative to core, e.g. `/v1/auth/me`;
 * the browser always calls the same origin (`/api/...`), which the dev server or reverse proxy forwards.
 */
export async function apiFetch<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers);
    headers.set('accept', 'application/json');
    // lets core tell our XHR calls from cross-site form posts (CSRF check, agree with backend)
    headers.set('x-requested-with', 'XMLHttpRequest');
    if (init.body && !(init.body instanceof FormData) && !headers.has('content-type')) {
        headers.set('content-type', 'application/json');
    }

    // absolute URL on the current origin (also what Node's fetch needs in tests)
    const url = new URL(`${config.apiBase}${path}`, window.location.origin);
    const response = await fetch(url, {
        ...init,
        headers,
        credentials: 'same-origin',
    });

    const body = await parseBody(response);
    if (!response.ok) {
        throw new ApiError(
            response.status,
            messageFrom(body, response.statusText),
            response.headers.get('x-request-id'),
            body,
        );
    }
    // the fetch boundary: callers validate with Zod or generated types
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    return body as T;
}

/** orval mutator (see orval.config.ts). */
export function orvalFetch<T>(url: string, init?: RequestInit): Promise<T> {
    return apiFetch<T>(url, init);
}
