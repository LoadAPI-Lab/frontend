import { routeTotals, type RunningTotals } from './aggregate';
import { type Percentiles, runResultSchema } from './schemas';

export interface RunSummary {
    avgRps: number;
    targetRps: number;
    durationSeconds: number;
    latency: Percentiles | null;
    totals: RunningTotals;
}

export function summarizeRunResult(value: unknown): RunSummary | null {
    const parsed = runResultSchema.safeParse(value);
    if (!parsed.success) {
        return null;
    }
    const result = parsed.data;
    return {
        avgRps: result.avgRps,
        targetRps: result.targetRps,
        durationSeconds: Math.round(result.durationMs / 1000),
        latency: result.targets.find((route) => route.responseTime)?.responseTime ?? null,
        totals: routeTotals(result.targets),
    };
}
