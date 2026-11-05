import { useCallback, useState } from 'react';

const STORAGE_KEY = 'routelab.sidebar.collapsed';

function read(): boolean {
    try {
        return window.localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
        return false;
    }
}

export function useSidebarCollapsed() {
    const [collapsed, setCollapsedState] = useState(read);
    const setCollapsed = useCallback((next: boolean) => {
        setCollapsedState(next);
        try {
            window.localStorage.setItem(STORAGE_KEY, String(next));
        } catch {
            return;
        }
    }, []);
    return [collapsed, setCollapsed] as const;
}
