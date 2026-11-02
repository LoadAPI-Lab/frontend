import type { RouteSnapshot, Snapshot } from './schemas';

export interface StatusBreakdown {
    '2xx': number;
    '3xx': number;
    '4xx': number;
    '5xx': number;
    network: number;
}

const STATUS_KEYS = [
    '2xx',
    '3xx',
    '4xx',
    '5xx',
    'network',
] as const satisfies readonly (keyof StatusBreakdown)[];

const isStatusKey = (key: string): key is keyof StatusBreakdown =>
    STATUS_KEYS.some((statusKey) => statusKey === key);

const emptyBreakdown = (): StatusBreakdown => ({
    '2xx': 0,
    '3xx': 0,
    '4xx': 0,
    '5xx': 0,
    network: 0,
});

/** Groups a route's status-code map by class and folds network errors into one bucket. */
export function groupStatusCodes(
    route: Pick<RouteSnapshot, 'statusCodes' | 'errors'>,
): StatusBreakdown {
    const result = emptyBreakdown();
    for (const [code, count] of Object.entries(route.statusCodes ?? {})) {
        const key = `${code.charAt(0)}xx`;
        if (isStatusKey(key)) {
            result[key] += count;
        }
    }
    for (const count of Object.values(route.errors ?? {})) {
        result.network += count ?? 0;
    }
    return result;
}

export interface RunningTotals {
    requests: number;
    errors: number;
    errorRate: number;
    statuses: StatusBreakdown;
}

/**
 * Sums per-second snapshots into running totals. Percentiles are NOT summable:
 * show the latest second's values live and the final result's values after the run.
 */
export function runningTotals(snapshots: readonly Snapshot[]): RunningTotals {
    const statuses = emptyBreakdown();
    let requests = 0;
    let errors = 0;

    for (const snapshot of snapshots) {
        for (const route of snapshot.targets) {
            requests += route.successCount + route.errorCount;
            errors += route.errorCount;
            const grouped = groupStatusCodes(route);
            for (const key of STATUS_KEYS) {
                statuses[key] += grouped[key];
            }
        }
    }

    return { requests, errors, errorRate: requests === 0 ? 0 : errors / requests, statuses };
}
