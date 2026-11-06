import { http, HttpResponse, sse } from 'msw';
import { z } from 'zod';

import type { RunStatus, Snapshot } from '@/api/live';

import { coreError } from './core-error';

interface MockRun {
    id: string;
    method: string;
    url: string;
    targetRps: number;
    durationSeconds: number;
    rampUpSeconds: number;
    createdAt: number;
    stoppedAt: number | null;
}

const runs = new Map<string, MockRun>();

export function resetMockTestRuns() {
    runs.clear();
}

const startSchema = z.object({
    type: z.literal('single'),
    config: z.object({
        target: z.object({ method: z.string(), url: z.string() }),
        targetRps: z.number(),
        durationSeconds: z.number(),
        rampUpSeconds: z.number().optional(),
    }),
});

const elapsedOf = (run: MockRun, now = Date.now()) =>
    Math.floor(((run.stoppedAt ?? now) - run.createdAt) / 1000);

function statusOf(run: MockRun): RunStatus {
    if (run.stoppedAt !== null) {
        return 'STOPPED';
    }
    return elapsedOf(run) >= run.durationSeconds ? 'COMPLETED' : 'RUNNING';
}

function wobble(seed: number): number {
    const value = Math.sin(seed * 12.9898) * 43_758.5453;
    return value - Math.floor(value);
}

export function mockSnapshot(run: MockRun, second: number): Snapshot {
    const ramp = run.rampUpSeconds > 0 ? Math.min(1, second / run.rampUpSeconds) : 1;
    const actualRps = Math.max(
        1,
        Math.round(run.targetRps * ramp * (0.97 + wobble(second) * 0.05)),
    );
    const serverErrors = wobble(second + 7) > 0.85 ? Math.ceil(actualRps * 0.004) : 0;
    const clientErrors = Math.round(actualRps * 0.02);
    const ok = actualRps - serverErrors - clientErrors;
    const base = 38 + wobble(second + 3) * 8 + ramp * 6;
    return {
        testId: run.id,
        timestamp: new Date(run.createdAt + second * 1000).toISOString(),
        elapsedSeconds: second,
        targetRps: run.targetRps,
        actualRps,
        targets: [
            {
                method: run.method,
                url: run.url,
                successCount: ok + clientErrors,
                errorCount: serverErrors,
                lateCount: 0,
                responseTime: {
                    p50Ms: Math.round(base),
                    p95Ms: Math.round(base * 2.8),
                    p99Ms: Math.round(base * 4.4),
                },
                statusCodes: {
                    '200': ok,
                    '404': clientErrors,
                    ...(serverErrors > 0 ? { '503': serverErrors } : {}),
                },
            },
        ],
    };
}

const runBody = (run: MockRun) => ({
    id: run.id,
    type: 'single',
    status: statusOf(run),
    createdAt: new Date(run.createdAt).toISOString(),
    startedAt: new Date(run.createdAt).toISOString(),
    ...(statusOf(run) === 'RUNNING'
        ? {}
        : {
              finishedAt: new Date(
                  run.stoppedAt ?? run.createdAt + run.durationSeconds * 1000,
              ).toISOString(),
          }),
});

const notFound = () => coreError(404, 'TEST_RUN.NOT_FOUND', 'Test run not found');

export const testRunHandlers = [
    http.post('*/v1/test-runs', async ({ request }) => {
        const parsed = startSchema.safeParse(await request.json());
        if (!parsed.success) {
            return coreError(400, 'VALIDATION.FAILED', 'The test configuration is invalid');
        }
        const active = [...runs.values()].some((run) => statusOf(run) === 'RUNNING');
        if (active) {
            return coreError(
                503,
                'TEST_RUN.CAPACITY_EXCEEDED',
                'Too many test runs are in progress, try again later',
            );
        }
        const { config } = parsed.data;
        const run: MockRun = {
            id: crypto.randomUUID(),
            method: config.target.method,
            url: config.target.url,
            targetRps: config.targetRps,
            durationSeconds: config.durationSeconds,
            rampUpSeconds: config.rampUpSeconds ?? 0,
            createdAt: Date.now(),
            stoppedAt: null,
        };
        runs.set(run.id, run);
        return HttpResponse.json({ id: run.id, status: 'RUNNING' }, { status: 201 });
    }),
    http.get('*/v1/test-runs', () =>
        HttpResponse.json({
            items: [...runs.values()].toReversed().map(runBody),
        }),
    ),
    http.get('*/v1/test-runs/:id', ({ params }) => {
        const run = runs.get(String(params.id));
        return run ? HttpResponse.json(runBody(run)) : notFound();
    }),
    http.post('*/v1/test-runs/:id/stop', ({ params }) => {
        const run = runs.get(String(params.id));
        if (!run) {
            return notFound();
        }
        if (statusOf(run) !== 'RUNNING') {
            return coreError(409, 'TEST_RUN.ALREADY_FINISHED', 'Test run has already finished');
        }
        run.stoppedAt = Date.now();
        return HttpResponse.json({ id: run.id, status: 'RUNNING' }, { status: 202 });
    }),
];

export const liveStreamHandlers = () => [
    sse<{ status: string; snapshot: string }>(
        '*/v1/test-runs/:id/metrics',
        ({ client, params, request }) => {
            const run = runs.get(String(params.id));
            if (!run) {
                client.send({
                    event: 'status',
                    data: JSON.stringify({ status: 'FAILED', reason: 'Test run not found' }),
                });
                client.close();
                return;
            }
            const sendStatus = () => {
                const status = statusOf(run);
                client.send({
                    event: 'status',
                    data: JSON.stringify(
                        status === 'STOPPED' ? { status, reason: 'Stopped by user' } : { status },
                    ),
                });
                return status;
            };
            if (sendStatus() !== 'RUNNING') {
                client.close();
                return;
            }
            let second = elapsedOf(run);
            const timer = setInterval(() => {
                second += 1;
                if (run.stoppedAt === null && second <= run.durationSeconds) {
                    client.send({
                        event: 'snapshot',
                        data: JSON.stringify(mockSnapshot(run, second)),
                    });
                }
                if (statusOf(run) !== 'RUNNING') {
                    clearInterval(timer);
                    sendStatus();
                    client.close();
                }
            }, 1000);
            request.signal.addEventListener('abort', () => clearInterval(timer));
        },
    ),
];
