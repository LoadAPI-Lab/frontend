import { z } from 'zod';

export const percentilesSchema = z.object({
    p50Ms: z.number(),
    p95Ms: z.number(),
    p99Ms: z.number(),
});

export const networkErrorSchema = z.enum([
    'timeout',
    'connection_refused',
    'connection_reset',
    'dns',
    'other',
]);

export const routeSnapshotSchema = z.object({
    method: z.string(),
    url: z.string(),
    successCount: z.number().int(),
    errorCount: z.number().int(),
    lateCount: z.number().int(),
    responseTime: percentilesSchema.optional(),
    serviceTime: percentilesSchema.optional(),
    statusCodes: z.record(z.string(), z.number().int()).optional(),
    errors: z.partialRecord(networkErrorSchema, z.number().int()).optional(),
});

export const snapshotSchema = z.object({
    testId: z.string(),
    timestamp: z.string(),
    elapsedSeconds: z.number().int(),
    targetRps: z.number(),
    actualRps: z.number(),
    targets: z.array(routeSnapshotSchema),
});

export const routeResultSchema = z.object({
    method: z.string(),
    url: z.string(),
    totalRequests: z.number().int(),
    successCount: z.number().int(),
    errorCount: z.number().int(),
    errorRate: z.number(),
    lateCount: z.number().int(),
    responseTime: percentilesSchema.optional(),
    serviceTime: percentilesSchema.optional(),
    statusCodes: z.record(z.string(), z.number().int()).optional(),
    errors: z.partialRecord(networkErrorSchema, z.number().int()).optional(),
});

export const runResultSchema = z.object({
    durationMs: z.number(),
    targetRps: z.number(),
    avgRps: z.number(),
    targets: z.array(routeResultSchema),
});

export const RUN_STATUSES = ['PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'STOPPED'] as const;

export const runStatusSchema = z.enum(RUN_STATUSES);

export const statusEventSchema = z.object({
    status: runStatusSchema,
    reason: z.string().optional(),
});

export type RunStatus = z.infer<typeof runStatusSchema>;

const FINAL_STATUSES: ReadonlySet<RunStatus> = new Set(['COMPLETED', 'FAILED', 'STOPPED']);

export const isFinalStatus = (status: RunStatus | null | undefined) =>
    status !== null && status !== undefined && FINAL_STATUSES.has(status);

export type Percentiles = z.infer<typeof percentilesSchema>;
export type NetworkError = z.infer<typeof networkErrorSchema>;
export type RouteSnapshot = z.infer<typeof routeSnapshotSchema>;
export type Snapshot = z.infer<typeof snapshotSchema>;
export type RouteResult = z.infer<typeof routeResultSchema>;
export type RunResult = z.infer<typeof runResultSchema>;
