import { ApiError, errorCode } from '@/api/fetcher';

export type SendProblem =
    | { kind: 'targetNotAllowed' }
    | { kind: 'rateLimited' }
    | { kind: 'failed'; message: string };

export const TARGET_NOT_ALLOWED = 'REQUEST.TARGET_NOT_ALLOWED';

export function sendProblem(error: Error): SendProblem {
    if (errorCode(error) === TARGET_NOT_ALLOWED) {
        return { kind: 'targetNotAllowed' };
    }
    if (error instanceof ApiError && error.status === 429) {
        return { kind: 'rateLimited' };
    }
    return { kind: 'failed', message: error.message };
}
