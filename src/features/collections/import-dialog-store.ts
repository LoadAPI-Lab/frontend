import { useSyncExternalStore } from 'react';

let open = false;
const listeners = new Set<() => void>();

export function setImportDialogOpen(next: boolean) {
    if (open === next) {
        return;
    }
    open = next;
    for (const listener of listeners) {
        listener();
    }
}

export function openImportDialog() {
    setImportDialogOpen(true);
}

function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

const snapshot = () => open;

export function useImportDialogOpen() {
    return [useSyncExternalStore(subscribe, snapshot), setImportDialogOpen] as const;
}
