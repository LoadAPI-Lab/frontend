import { HttpResponse } from 'msw';

export function coreError(status: number, code: string, message: string, requestId = 'req_mock') {
    return HttpResponse.json(
        {
            success: false,
            error: { code, message, retryable: status >= 500 },
            meta: {
                service: 'core',
                request: { requestId, path: '/', method: 'GET' },
                timestamp: new Date().toISOString(),
            },
        },
        { status },
    );
}
