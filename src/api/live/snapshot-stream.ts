import { refreshSession } from '@/api/fetcher';
import { config } from '@/config';

import type { LiveConnection, LiveRunStore } from './live-store';
import { isFinalStatus, type Snapshot, snapshotSchema, statusEventSchema } from './schemas';

export interface EventSourceLike {
    addEventListener(type: string, listener: (event: MessageEvent<string>) => void): void;
    close(): void;
}

export interface StreamOptions {
    createEventSource?: (url: string) => EventSourceLike;
    refresh?: () => Promise<boolean>;
    backoffMs?: readonly number[];
    maxAttempts?: number;
    batchMs?: number;
}

export const DEFAULT_BACKOFF_MS = [1000, 2000, 4000, 8000, 10_000] as const;
export const DEFAULT_MAX_ATTEMPTS = 8;
export const DEFAULT_BATCH_MS = 50;

export const metricsUrl = (runId: string) =>
    `${config.apiBase}/v1/test-runs/${encodeURIComponent(runId)}/metrics`;

function parseJson(data: string): unknown {
    try {
        return JSON.parse(data);
    } catch {
        return null;
    }
}

export function streamRun(
    runId: string,
    store: LiveRunStore,
    options: StreamOptions = {},
): () => void {
    const {
        createEventSource = (url) => new EventSource(url),
        refresh = refreshSession,
        backoffMs = DEFAULT_BACKOFF_MS,
        maxAttempts = DEFAULT_MAX_ATTEMPTS,
        batchMs = DEFAULT_BATCH_MS,
    } = options;

    let pending: Snapshot[] = [];
    let batchTimer: ReturnType<typeof setTimeout> | undefined;

    const flushSnapshots = () => {
        clearTimeout(batchTimer);
        batchTimer = undefined;
        if (pending.length > 0) {
            const batch = pending;
            pending = [];
            store.addSnapshots(batch);
        }
    };

    const queueSnapshot = (snapshot: Snapshot) => {
        if (batchMs <= 0) {
            store.addSnapshot(snapshot);
            return;
        }
        pending.push(snapshot);
        batchTimer ??= setTimeout(flushSnapshots, batchMs);
    };

    let source: EventSourceLike | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;
    let refreshed = false;
    let stopped = false;

    const finish = (connection: LiveConnection) => {
        stopped = true;
        clearTimeout(timer);
        flushSnapshots();
        source?.close();
        store.setConnection(connection);
    };

    const scheduleReconnect = () => {
        if (attempts >= maxAttempts) {
            finish('lost');
            return;
        }
        const delay = backoffMs[Math.min(attempts, backoffMs.length - 1)] ?? 1000;
        attempts += 1;
        store.setConnection('reconnecting');
        timer = setTimeout(connect, delay);
    };

    function connect() {
        let received = false;
        const current = createEventSource(metricsUrl(runId));
        source = current;

        const markReceived = () => {
            received = true;
            attempts = 0;
            refreshed = false;
            store.setConnection('open');
        };

        current.addEventListener('open', () => store.setConnection('open'));

        current.addEventListener('status', (event) => {
            const parsed = statusEventSchema.safeParse(parseJson(event.data));
            if (!parsed.success) {
                return;
            }
            markReceived();
            flushSnapshots();
            store.setStatus(parsed.data.status, parsed.data.reason);
            if (isFinalStatus(parsed.data.status)) {
                finish('closed');
            }
        });

        current.addEventListener('snapshot', (event) => {
            const parsed = snapshotSchema.safeParse(parseJson(event.data));
            if (parsed.success) {
                markReceived();
                queueSnapshot(parsed.data);
            }
        });

        current.addEventListener('error', () => {
            current.close();
            if (stopped) {
                return;
            }
            if (!received && !refreshed) {
                refreshed = true;
                store.setConnection('reconnecting');
                void refresh().then((ok) => {
                    if (stopped) {
                        return;
                    }
                    if (ok) {
                        connect();
                    } else {
                        finish('expired');
                    }
                });
                return;
            }
            scheduleReconnect();
        });
    }

    store.setConnection('connecting');
    connect();

    return () => {
        stopped = true;
        clearTimeout(timer);
        flushSnapshots();
        source?.close();
    };
}
