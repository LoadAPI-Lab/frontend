import { http, HttpResponse, sse } from 'msw';
import { z } from 'zod';

import type { RunResult, RunStatus, Snapshot } from '@/api/live';

import { coreError } from './core-error';
import { mockScenarioLink } from './scenarios';

interface MockStep {
    target: { method: string; url: string; headers?: Record<string, string>; body?: string };
    extract?: { name: string; path: string }[];
}

interface MockRun {
    id: string;
    steps: MockStep[] | null;
    scenarioId: string | null;
    method: string;
    url: string;
    targetRps: number;
    durationSeconds: number;
    rampUpSeconds: number;
    createdAt: number;
    stoppedAt: number | null;
}

const runs = new Map<string, MockRun>();

const idempotencyKeys = new Map<string, { fingerprint: string; runId: string }>();

export function resetMockTestRuns() {
    runs.clear();
    idempotencyKeys.clear();
}

const targetSchema = z.object({
    method: z.string(),
    url: z.string(),
    headers: z.record(z.string(), z.string()).optional(),
    body: z.string().optional(),
});

const startSchema = z.discriminatedUnion('type', [
    z.object({
        type: z.literal('single'),
        config: z.object({
            target: targetSchema,
            targetRps: z.number(),
            durationSeconds: z.number(),
            rampUpSeconds: z.number().optional(),
        }),
    }),
    z.object({
        type: z.literal('scenario'),
        config: z.object({
            steps: z
                .array(
                    z.object({
                        target: targetSchema,
                        extract: z
                            .array(z.object({ name: z.string(), path: z.string() }))
                            .optional(),
                    }),
                )
                .min(1),
        }),
        scenarioId: z.string().optional(),
    }),
]);

export const MOCK_MISSING_FIELD = 'missing';
const SCENARIO_SECONDS = 1;
const variableRe = /\{\{(\w+)\}\}/g;

function successCode(method: string) {
    if (method === 'POST') {
        return 201;
    }
    return method === 'DELETE' ? 204 : 200;
}

export function mockScenarioResult(steps: MockStep[], stopped = false) {
    const vars = new Set<string>();
    const results = steps.map((step, index) => {
        const base = { method: step.target.method, url: step.target.url };
        if (stopped) {
            return { ...base, status: 'SKIPPED' as const, description: 'test stopped' };
        }
        const texts = [
            step.target.url,
            step.target.body ?? '',
            ...Object.values(step.target.headers ?? {}),
        ];
        const missing = [
            ...new Set(
                texts.flatMap((text) =>
                    [...text.matchAll(variableRe)].map((match) => match[1] ?? ''),
                ),
            ),
        ].filter((name) => !vars.has(name));
        if (missing.length > 0) {
            return {
                ...base,
                status: 'SKIPPED' as const,
                description: `undefined variables: ${missing.join(', ')}`,
            };
        }
        const durationMs = 18 + ((index * 17) % 40);
        if (step.target.url.includes(MOCK_FAILING_PATH)) {
            return {
                ...base,
                status: 'FAILED' as const,
                statusCode: 500,
                durationMs,
                description: 'unexpected status 500',
            };
        }
        const broken = step.extract?.find((rule) => rule.path.includes(MOCK_MISSING_FIELD));
        if (broken) {
            return {
                ...base,
                status: 'FAILED' as const,
                statusCode: successCode(step.target.method),
                durationMs,
                description: `extract "${broken.name}": path "${broken.path}": field "${MOCK_MISSING_FIELD}" not found`,
            };
        }
        for (const rule of step.extract ?? []) {
            vars.add(rule.name);
        }
        return {
            ...base,
            status: 'OK' as const,
            statusCode: successCode(step.target.method),
            durationMs,
        };
    });
    const count = (status: string) => results.filter((result) => result.status === status).length;
    return {
        summary: {
            totalSteps: results.length,
            okCount: count('OK'),
            failedCount: count('FAILED'),
            skippedCount: count('SKIPPED'),
            durationMs: results.reduce(
                (total, result) => total + ('durationMs' in result ? result.durationMs : 0),
                0,
            ),
        },
        steps: results,
    };
}

export const MOCK_FAILING_PATH = '/status/599';
export const MOCK_NOT_FOUND_PATH = '/status/404';
export const MOCK_FAILURE_REASON = 'The worker lost its connection to the target.';
const FAIL_AFTER_SECONDS = 2;

const elapsedOf = (run: MockRun, now = Date.now()) =>
    Math.floor(((run.stoppedAt ?? now) - run.createdAt) / 1000);

const failing = (run: MockRun) => run.steps === null && run.url.includes(MOCK_FAILING_PATH);

function statusOf(run: MockRun): RunStatus {
    if (run.stoppedAt !== null) {
        return 'STOPPED';
    }
    if (failing(run) && elapsedOf(run) >= FAIL_AFTER_SECONDS) {
        return 'FAILED';
    }
    return elapsedOf(run) >= run.durationSeconds ? 'COMPLETED' : 'RUNNING';
}

const lastSecond = (run: MockRun) => (failing(run) ? FAIL_AFTER_SECONDS : run.durationSeconds);

const finishedSecond = (run: MockRun) => Math.min(elapsedOf(run), lastSecond(run));

function sum(values: readonly number[]) {
    return values.reduce((total, value) => total + value, 0);
}

function mergeCounts(maps: readonly (Record<string, number> | undefined)[]) {
    const merged: Record<string, number> = {};
    for (const map of maps) {
        for (const [key, count] of Object.entries(map ?? {})) {
            merged[key] = (merged[key] ?? 0) + count;
        }
    }
    return merged;
}

export function mockResult(run: MockRun): RunResult {
    const seconds = Math.max(1, finishedSecond(run));
    const routes = Array.from(
        { length: seconds },
        (_, index) => mockSnapshot(run, index + 1).targets[0],
    ).filter((route) => route !== undefined);
    const successCount = sum(routes.map((route) => route.successCount));
    const errorCount = sum(routes.map((route) => route.errorCount));
    const totalRequests = successCount + errorCount;
    const average = (pick: (route: (typeof routes)[number]) => number | undefined) =>
        Math.round(sum(routes.map((route) => pick(route) ?? 0)) / routes.length);
    return {
        durationMs: seconds * 1000,
        targetRps: run.targetRps,
        avgRps: Math.round((totalRequests / seconds) * 10) / 10,
        targets: [
            {
                method: run.method,
                url: run.url,
                totalRequests,
                successCount,
                errorCount,
                errorRate: totalRequests === 0 ? 0 : errorCount / totalRequests,
                lateCount: sum(routes.map((route) => route.lateCount)),
                responseTime: {
                    p50Ms: average((route) => route.responseTime?.p50Ms),
                    p95Ms: average((route) => route.responseTime?.p95Ms),
                    p99Ms: average((route) => route.responseTime?.p99Ms),
                },
                serviceTime: {
                    p50Ms: average((route) => route.serviceTime?.p50Ms),
                    p95Ms: average((route) => route.serviceTime?.p95Ms),
                    p99Ms: average((route) => route.serviceTime?.p99Ms),
                },
                statusCodes: mergeCounts(routes.map((route) => route.statusCodes)),
                errors: { timeout: sum(routes.map((route) => route.errors?.timeout ?? 0)) },
            },
        ],
    };
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
    const timeouts = wobble(second + 11) > 0.9 ? 1 : 0;
    const late = wobble(second + 13) > 0.92 ? Math.ceil(actualRps * 0.01) : 0;
    const clientErrors = Math.round(actualRps * 0.02);
    const ok = actualRps - serverErrors - clientErrors - timeouts;
    const base = 38 + wobble(second + 3) * 8 + ramp * 6;
    if (run.url.includes(MOCK_NOT_FOUND_PATH)) {
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
                    successCount: 0,
                    errorCount: actualRps,
                    lateCount: 0,
                    responseTime: {
                        p50Ms: Math.round(base),
                        p95Ms: Math.round(base * 2),
                        p99Ms: Math.round(base * 3),
                    },
                    statusCodes: { '404': actualRps },
                },
            ],
        };
    }
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
                errorCount: serverErrors + timeouts,
                lateCount: late,
                responseTime: {
                    p50Ms: Math.round(base),
                    p95Ms: Math.round(base * 2.8),
                    p99Ms: Math.round(base * 4.4),
                },
                serviceTime: {
                    p50Ms: Math.round(base * 0.85),
                    p95Ms: Math.round(base * 2.3),
                    p99Ms: Math.round(base * 3.4),
                },
                statusCodes: {
                    '200': ok,
                    '404': clientErrors,
                    ...(serverErrors > 0 ? { '503': serverErrors } : {}),
                },
                ...(timeouts > 0 ? { errors: { timeout: timeouts } } : {}),
            },
        ],
    };
}

function runBody(run: MockRun) {
    const status = statusOf(run);
    const base = {
        id: run.id,
        type: run.steps ? 'scenario' : 'single',
        status,
        createdAt: new Date(run.createdAt).toISOString(),
        startedAt: new Date(run.createdAt).toISOString(),
        ...mockScenarioLink(run.scenarioId),
    };
    if (status === 'RUNNING') {
        return base;
    }
    const finishedAt = new Date(
        run.stoppedAt ?? run.createdAt + finishedSecond(run) * 1000,
    ).toISOString();
    return status === 'FAILED'
        ? { ...base, finishedAt, reason: MOCK_FAILURE_REASON }
        : { ...base, finishedAt };
}

function listItem(run: MockRun) {
    if (run.steps) {
        const finished = statusOf(run) !== 'RUNNING';
        return {
            ...runBody(run),
            stepsCount: run.steps.length,
            ...(finished
                ? { okCount: mockScenarioResult(run.steps, run.stoppedAt !== null).summary.okCount }
                : {}),
        };
    }
    const result =
        statusOf(run) === 'COMPLETED' || statusOf(run) === 'STOPPED' ? mockResult(run) : null;
    return {
        ...runBody(run),
        request: { method: run.method, url: run.url },
        targetRps: run.targetRps,
        durationSeconds: run.durationSeconds,
        ...(result?.targets[0]?.responseTime
            ? { p95Ms: result.targets[0].responseTime.p95Ms }
            : {}),
    };
}

function runDetail(run: MockRun) {
    const status = statusOf(run);
    if (run.steps) {
        return {
            ...runBody(run),
            config: { steps: run.steps },
            ...(status === 'RUNNING'
                ? {}
                : { result: mockScenarioResult(run.steps, run.stoppedAt !== null) }),
        };
    }
    return {
        ...runBody(run),
        config: {
            target: { method: run.method, url: run.url },
            targetRps: run.targetRps,
            durationSeconds: run.durationSeconds,
            rampUpSeconds: run.rampUpSeconds,
        },
        ...(status === 'COMPLETED' || status === 'STOPPED' ? { result: mockResult(run) } : {}),
    };
}

const notFound = () => coreError(404, 'TEST_RUN.NOT_FOUND', 'Test run not found');

export const testRunHandlers = [
    http.post('*/v1/test-runs', async ({ request }) => {
        const raw: unknown = await request.json();
        const parsed = startSchema.safeParse(raw);
        if (!parsed.success) {
            return coreError(400, 'VALIDATION.FAILED', 'The test configuration is invalid');
        }
        const key = request.headers.get('Idempotency-Key');
        const fingerprint = JSON.stringify(raw);
        const known = key ? idempotencyKeys.get(key) : undefined;
        const knownRun = known ? runs.get(known.runId) : undefined;
        if (known && known.fingerprint !== fingerprint) {
            return coreError(
                422,
                'TEST_RUN.IDEMPOTENCY_KEY_REUSED',
                'This idempotency key was already used for a different test config',
            );
        }
        if (knownRun) {
            return HttpResponse.json(
                { id: knownRun.id, status: statusOf(knownRun) },
                { status: 201 },
            );
        }
        const active = [...runs.values()].some((run) => statusOf(run) === 'RUNNING');
        if (active) {
            return coreError(
                503,
                'TEST_RUN.CAPACITY_EXCEEDED',
                'Too many test runs are in progress, try again later',
            );
        }
        const start = parsed.data;
        const first = start.type === 'scenario' ? start.config.steps[0] : undefined;
        const run: MockRun =
            start.type === 'scenario'
                ? {
                      id: crypto.randomUUID(),
                      steps: start.config.steps,
                      scenarioId: start.scenarioId ?? null,
                      method: first?.target.method ?? 'GET',
                      url: first?.target.url ?? '',
                      targetRps: 1,
                      durationSeconds: SCENARIO_SECONDS,
                      rampUpSeconds: 0,
                      createdAt: Date.now(),
                      stoppedAt: null,
                  }
                : {
                      id: crypto.randomUUID(),
                      steps: null,
                      scenarioId: null,
                      method: start.config.target.method,
                      url: start.config.target.url,
                      targetRps: start.config.targetRps,
                      durationSeconds: start.config.durationSeconds,
                      rampUpSeconds: start.config.rampUpSeconds ?? 0,
                      createdAt: Date.now(),
                      stoppedAt: null,
                  };
        runs.set(run.id, run);
        if (key) {
            idempotencyKeys.set(key, { fingerprint, runId: run.id });
        }
        return HttpResponse.json({ id: run.id, status: 'PENDING' }, { status: 201 });
    }),
    http.get('*/v1/test-runs', ({ request }) => {
        const search = new URL(request.url).searchParams;
        const status = search.get('status');
        const type = search.get('type');
        const limit = Number(search.get('limit') ?? 20);
        const offset = Number(search.get('cursor') ?? 0);
        const matching = [...runs.values()]
            .toReversed()
            .map(listItem)
            .filter((run) => (!status || run.status === status) && (!type || run.type === type));
        const items = matching.slice(offset, offset + limit);
        const next = offset + limit;
        return HttpResponse.json({
            items,
            ...(next < matching.length ? { nextCursor: String(next) } : {}),
        });
    }),
    http.get('*/v1/test-runs/:id', ({ params }) => {
        const run = runs.get(String(params.id));
        return run ? HttpResponse.json(runDetail(run)) : notFound();
    }),
    http.post('*/v1/test-runs/:id/rerun', ({ params }) => {
        const source = runs.get(String(params.id));
        if (!source) {
            return notFound();
        }
        if ([...runs.values()].some((run) => statusOf(run) === 'RUNNING')) {
            return coreError(
                503,
                'TEST_RUN.CAPACITY_EXCEEDED',
                'Too many test runs are in progress, try again later',
            );
        }
        const run: MockRun = {
            ...source,
            id: crypto.randomUUID(),
            createdAt: Date.now(),
            stoppedAt: null,
        };
        runs.set(run.id, run);
        return HttpResponse.json({ id: run.id, status: 'PENDING' }, { status: 201 });
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

function statusEvent(status: RunStatus) {
    if (status === 'STOPPED') {
        return { status, reason: 'Stopped by user' };
    }
    if (status === 'FAILED') {
        return { status, reason: MOCK_FAILURE_REASON };
    }
    return { status };
}

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
                    data: JSON.stringify(statusEvent(status)),
                });
                return status;
            };
            const sendHistory = (upTo: number) => {
                if (run.steps) {
                    return;
                }
                for (let past = 1; past <= upTo; past += 1) {
                    client.send({
                        event: 'snapshot',
                        data: JSON.stringify(mockSnapshot(run, past)),
                    });
                }
            };
            if (statusOf(run) !== 'RUNNING') {
                sendHistory(finishedSecond(run));
                sendStatus();
                client.close();
                return;
            }
            sendStatus();
            let second = elapsedOf(run);
            sendHistory(Math.min(second, lastSecond(run)));
            const timer = setInterval(() => {
                second += 1;
                if (run.steps === null && run.stoppedAt === null && second <= lastSecond(run)) {
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
