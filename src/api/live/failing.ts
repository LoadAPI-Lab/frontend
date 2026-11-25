import { NETWORK_ERRORS, routeTotals, runningTotals } from './aggregate';
import type { NetworkError, Snapshot } from './schemas';

export const FAILING_THRESHOLD = 0.95;
export const FAILING_WINDOW_SECONDS = 5;
export const FAILING_MIN_REQUESTS = 20;

export type FailureCause =
    | { kind: 'status'; code: string; all: boolean }
    | { kind: 'network'; error: NetworkError; all: boolean };

interface Candidate {
    cause: FailureCause;
    count: number;
}

const isFailingCode = (code: string) => Number(code) >= 400;

function isFailingWindow(snapshots: readonly Snapshot[], window: readonly Snapshot[]) {
    const first = window[0];
    const last = window.at(-1);
    if (window.length < FAILING_WINDOW_SECONDS || !first || !last) {
        return false;
    }
    if (last.elapsedSeconds - first.elapsedSeconds !== FAILING_WINDOW_SECONDS - 1) {
        return false;
    }
    if (runningTotals(snapshots).requests < FAILING_MIN_REQUESTS) {
        return false;
    }
    return window.every((snapshot) => {
        const totals = routeTotals(snapshot.targets);
        return totals.requests > 0 && totals.errorRate >= FAILING_THRESHOLD;
    });
}

export function failingCause(snapshots: readonly Snapshot[]): FailureCause | null {
    const window = snapshots.slice(-FAILING_WINDOW_SECONDS);
    if (!isFailingWindow(snapshots, window)) {
        return null;
    }
    const totals = runningTotals(window);
    const candidates: Candidate[] = [
        ...Object.entries(totals.codes)
            .filter(([code, count]) => isFailingCode(code) && count > 0)
            .toSorted(([first], [second]) => first.localeCompare(second))
            .map(([code, count]) => ({
                cause: { kind: 'status' as const, code, all: count === totals.requests },
                count,
            })),
        ...NETWORK_ERRORS.filter((error) => totals.networkErrors[error] > 0).map((error) => ({
            cause: {
                kind: 'network' as const,
                error,
                all: totals.networkErrors[error] === totals.requests,
            },
            count: totals.networkErrors[error],
        })),
    ];
    let top: Candidate | null = null;
    for (const candidate of candidates) {
        if (!top || candidate.count > top.count) {
            top = candidate;
        }
    }
    return top?.cause ?? null;
}
