import { useState } from 'react';

const STORAGE_KEY = 'routelab.servers';

function readAll(): Record<string, string> {
    try {
        const parsed: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}');
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            return {};
        }
        return Object.fromEntries(
            Object.entries(parsed).filter(
                (entry): entry is [string, string] => typeof entry[1] === 'string',
            ),
        );
    } catch {
        return {};
    }
}

export function useServer(specId: string, servers: { url: string }[]) {
    const [chosen, setChosen] = useState(() => readAll()[specId]);
    const server = chosen ?? servers[0]?.url ?? '';
    const setServer = (url: string) => {
        setChosen(url);
        try {
            window.localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify({ ...readAll(), [specId]: url }),
            );
        } catch {
            return;
        }
    };
    return [server, setServer] as const;
}
