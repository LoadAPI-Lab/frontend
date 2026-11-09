import type { RunStatus } from '@/api/live';

export const STATUS_TEXT: Record<RunStatus, string> = {
    PENDING: 'text-fg-muted',
    RUNNING: 'text-info',
    COMPLETED: 'text-accent',
    STOPPED: 'text-fg-muted',
    FAILED: 'text-danger',
};
