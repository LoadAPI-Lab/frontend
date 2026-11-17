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

export function rememberedServer(specId: string): string | undefined {
    return readAll()[specId];
}

export function rememberServer(specId: string, url: string) {
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...readAll(), [specId]: url }));
    } catch {
        return;
    }
}
