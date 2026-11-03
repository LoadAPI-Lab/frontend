import { useCallback, useState } from 'react';

const STORAGE_KEY = 'routelab.sidebar.collapsed';

function read(): boolean {
    try {
        return window.localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
        return false;
    }
}

/** Per-browser UI preference; storage may be unavailable (private mode), so failures fall back to expanded. */
export function useSidebarCollapsed() {
    const [collapsed, setCollapsedState] = useState(read);
    const setCollapsed = useCallback((next: boolean) => {
        setCollapsedState(next);
        try {
            window.localStorage.setItem(STORAGE_KEY, String(next));
        } catch {
            // ignore: preference simply won't persist
        }
    }, []);
    return [collapsed, setCollapsed] as const;
}
