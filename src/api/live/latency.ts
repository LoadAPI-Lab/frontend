import type { Percentiles, Snapshot } from './schemas';

export type LatencySeries = [
    elapsed: number[],
    p50: (number | null)[],
    p95: (number | null)[],
    p99: (number | null)[],
];

export function snapshotLatency(snapshot: Snapshot): Percentiles | null {
    return snapshot.targets.find((route) => route.responseTime)?.responseTime ?? null;
}

export function latencySeries(snapshots: readonly Snapshot[]): LatencySeries {
    const series: LatencySeries = [[], [], [], []];
    for (const snapshot of snapshots) {
        const latency = snapshotLatency(snapshot);
        series[0].push(snapshot.elapsedSeconds);
        series[1].push(latency?.p50Ms ?? null);
        series[2].push(latency?.p95Ms ?? null);
        series[3].push(latency?.p99Ms ?? null);
    }
    return series;
}
