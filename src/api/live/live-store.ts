import type { RunStatus, Snapshot } from './schemas';

export type LiveConnection = 'connecting' | 'open' | 'reconnecting' | 'closed' | 'expired' | 'lost';

export interface LiveState {
    status: RunStatus | null;
    reason: string | null;
    snapshots: readonly Snapshot[];
    connection: LiveConnection;
}

const INITIAL: LiveState = { status: null, reason: null, snapshots: [], connection: 'connecting' };

export class LiveRunStore {
    private state: LiveState = INITIAL;
    private readonly listeners = new Set<() => void>();

    constructor(private readonly maxPoints: number) {}

    getState = (): LiveState => this.state;

    subscribe = (listener: () => void): (() => void) => {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    };

    setConnection(connection: LiveConnection) {
        if (this.state.connection !== connection) {
            this.set({ connection });
        }
    }

    setStatus(status: RunStatus, reason: string | undefined) {
        this.set({ status, reason: reason ?? null });
    }

    addSnapshot(snapshot: Snapshot) {
        const previous = this.state.snapshots.at(-1);
        const kept =
            previous && previous.elapsedSeconds >= snapshot.elapsedSeconds
                ? this.state.snapshots.filter(
                      (item) => item.elapsedSeconds < snapshot.elapsedSeconds,
                  )
                : this.state.snapshots;
        this.set({ snapshots: [...kept, snapshot].slice(-this.maxPoints) });
    }

    addSnapshots(snapshots: readonly Snapshot[]) {
        if (snapshots.length === 0) {
            return;
        }
        const bySecond = new Map(
            this.state.snapshots.map((snapshot) => [snapshot.elapsedSeconds, snapshot]),
        );
        for (const snapshot of snapshots) {
            bySecond.set(snapshot.elapsedSeconds, snapshot);
        }
        const merged = [...bySecond.values()]
            .toSorted((first, second) => first.elapsedSeconds - second.elapsedSeconds)
            .slice(-this.maxPoints);
        this.set({ snapshots: merged });
    }

    private set(changes: Partial<LiveState>) {
        this.state = { ...this.state, ...changes };
        for (const listener of this.listeners) {
            listener();
        }
    }
}
