import { useCallback, useState } from 'react';

const STORAGE_KEY = 'routelab.collections.expanded';

function read(): Set<string> {
    try {
        const parsed: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]');
        return new Set(Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : []);
    } catch {
        return new Set();
    }
}

function write(ids: Set<string>) {
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
    } catch {
        return;
    }
}

export function useExpanded() {
    const [expanded, setExpanded] = useState(read);
    const setOne = useCallback((id: string, open: boolean) => {
        setExpanded((current) => {
            const next = new Set(current);
            if (open) {
                next.add(id);
            } else {
                next.delete(id);
            }
            write(next);
            return next;
        });
    }, []);
    return [expanded, setOne] as const;
}
