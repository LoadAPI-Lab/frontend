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
    const urls = servers.map((server) => server.url);
    const [chosen, setChosen] = useState(() => readAll()[specId]);
    let server = urls[0] ?? '';
    if (urls.length === 0) {
        server = chosen ?? '';
    } else if (chosen && urls.includes(chosen)) {
        server = chosen;
    }
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
