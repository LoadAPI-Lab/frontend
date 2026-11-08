import {
    type NetworkError,
    networkErrorSchema,
    type RouteSnapshot,
    type Snapshot,
} from './schemas';

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
    late: number;
    statuses: StatusBreakdown;
    codes: Record<string, number>;
    networkErrors: Record<NetworkError, number>;
}

export const NETWORK_ERRORS = networkErrorSchema.options;

const emptyNetworkErrors = (): Record<NetworkError, number> => ({
    timeout: 0,
    connection_refused: 0,
    connection_reset: 0,
    dns: 0,
    other: 0,
});

export function runningTotals(snapshots: readonly Snapshot[]): RunningTotals {
    const statuses = emptyBreakdown();
    const networkErrors = emptyNetworkErrors();
    const codes: Record<string, number> = {};
    let requests = 0;
    let errors = 0;
    let late = 0;

    for (const snapshot of snapshots) {
        for (const route of snapshot.targets) {
            requests += route.successCount + route.errorCount;
            errors += route.errorCount;
            late += route.lateCount;
            for (const [code, count] of Object.entries(route.statusCodes ?? {})) {
                codes[code] = (codes[code] ?? 0) + count;
            }
            for (const kind of NETWORK_ERRORS) {
                networkErrors[kind] += route.errors?.[kind] ?? 0;
            }
            const grouped = groupStatusCodes(route);
            for (const key of STATUS_KEYS) {
                statuses[key] += grouped[key];
            }
        }
    }

    return {
        requests,
        errors,
        errorRate: requests === 0 ? 0 : errors / requests,
        late,
        statuses,
        codes,
        networkErrors,
    };
}
