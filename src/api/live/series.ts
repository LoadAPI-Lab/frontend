import { groupStatusCodes } from './aggregate';
import type { Percentiles, Snapshot } from './schemas';

export function snapshotServiceTime(snapshot: Snapshot): Percentiles | null {
    return snapshot.targets.find((route) => route.serviceTime)?.serviceTime ?? null;
}

export function serviceTimeSeries(
    snapshots: readonly Snapshot[],
): [p95: (number | null)[], p99: (number | null)[]] {
    const p95: (number | null)[] = [];
    const p99: (number | null)[] = [];
    for (const snapshot of snapshots) {
        const serviceTime = snapshotServiceTime(snapshot);
        p95.push(serviceTime?.p95Ms ?? null);
        p99.push(serviceTime?.p99Ms ?? null);
    }
    return [p95, p99];
}

export function throughputSeries(
    snapshots: readonly Snapshot[],
): [elapsed: number[], actual: number[], target: number[]] {
    return [
        snapshots.map((snapshot) => snapshot.elapsedSeconds),
        snapshots.map((snapshot) => snapshot.actualRps),
        snapshots.map((snapshot) => snapshot.targetRps),
    ];
}

export function errorSeries(
    snapshots: readonly Snapshot[],
): [elapsed: number[], clientErrors: number[], serverErrors: number[], network: number[]] {
    const series: [number[], number[], number[], number[]] = [[], [], [], []];
    for (const snapshot of snapshots) {
        let clientErrors = 0;
        let serverErrors = 0;
        let network = 0;
        for (const route of snapshot.targets) {
            const grouped = groupStatusCodes(route);
            clientErrors += grouped['4xx'];
            serverErrors += grouped['5xx'];
            network += grouped.network;
        }
        series[0].push(snapshot.elapsedSeconds);
        series[1].push(clientErrors);
        series[2].push(serverErrors);
        series[3].push(network);
    }
    return series;
}
