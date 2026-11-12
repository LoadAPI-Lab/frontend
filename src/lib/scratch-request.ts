import { useSyncExternalStore } from 'react';
import { z } from 'zod';

import { HTTP_METHODS, type HttpMethod } from './http-method';
import { emptyDraft, type KeyValueRow, newRow, type RequestDraft } from './request-draft';

const KEY = 'routelab.tests.scratch';

export interface ScratchRequest {
    method: HttpMethod;
    url: string;
    draft: RequestDraft;
}

const rowSchema = z.object({ id: z.string(), key: z.string(), value: z.string() });

const authSchema = z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('none') }),
    z.object({ kind: z.literal('bearer'), token: z.string() }),
    z.object({ kind: z.literal('basic'), username: z.string(), password: z.string() }),
    z.object({
        kind: z.literal('apiKey'),
        name: z.string(),
        value: z.string(),
        location: z.enum(['header', 'query']),
    }),
]);

const scratchSchema: z.ZodType<ScratchRequest> = z.object({
    method: z.enum(HTTP_METHODS),
    url: z.string(),
    draft: z.object({
        body: z.string(),
        headers: z.array(rowSchema),
        query: z.array(rowSchema),
        pathParams: z.record(z.string(), z.string()),
        auth: authSchema,
    }),
});

export const emptyScratch = (): ScratchRequest => ({
    method: 'GET',
    url: '',
    draft: emptyDraft(),
});

const hasKey = (rows: KeyValueRow[]) => rows.some((row) => row.key.trim() !== '');

export function hasScratchContent({ url, draft }: ScratchRequest): boolean {
    return (
        url.trim() !== '' ||
        draft.body.trim() !== '' ||
        hasKey(draft.headers) ||
        hasKey(draft.query) ||
        draft.auth.kind !== 'none' ||
        Object.values(draft.pathParams).some((value) => value.trim() !== '')
    );
}

function splitUrl(url: string) {
    const hashIndex = url.indexOf('#');
    const beforeHash = hashIndex === -1 ? url : url.slice(0, hashIndex);
    const hash = hashIndex === -1 ? '' : url.slice(hashIndex);
    const queryIndex = beforeHash.indexOf('?');
    return queryIndex === -1
        ? { base: beforeHash, query: '', hash }
        : { base: beforeHash.slice(0, queryIndex), query: beforeHash.slice(queryIndex + 1), hash };
}

export function urlWithoutQuery(url: string): string {
    const { base, hash } = splitUrl(url);
    return base + hash;
}

export function queryRowsOf(url: string, previous: KeyValueRow[]): KeyValueRow[] {
    return [...new URLSearchParams(splitUrl(url).query)].map(([key, value], index) => {
        const row = previous[index];
        return row ? { id: row.id, key, value } : newRow(key, value);
    });
}

export function urlWithQueryRows(url: string, rows: KeyValueRow[]): string {
    const { base, hash } = splitUrl(url);
    const pairs = rows
        .filter((row) => row.key.trim() !== '')
        .map((row): [string, string] => [row.key.trim(), row.value]);
    const query = new URLSearchParams(pairs).toString();
    return `${base}${query ? `?${query}` : ''}${hash}`;
}

const listeners = new Set<() => void>();
let cachedRaw: string | null = null;
let cached: ScratchRequest | null = null;

function storedRaw(): string | null {
    try {
        return sessionStorage.getItem(KEY);
    } catch {
        return null;
    }
}

function parse(raw: string | null): ScratchRequest | null {
    if (raw === null) {
        return null;
    }
    try {
        const parsed = scratchSchema.safeParse(JSON.parse(raw));
        return parsed.success ? parsed.data : null;
    } catch {
        return null;
    }
}

export function readScratch(): ScratchRequest | null {
    const raw = storedRaw();
    if (raw !== cachedRaw) {
        cachedRaw = raw;
        cached = parse(raw);
    }
    return cached;
}

function store(raw: string | null) {
    try {
        if (raw === null) {
            sessionStorage.removeItem(KEY);
        } else {
            sessionStorage.setItem(KEY, raw);
        }
    } catch {
        return;
    }
}

function notify() {
    for (const listener of listeners) {
        listener();
    }
}

export function saveScratch(scratch: ScratchRequest) {
    store(hasScratchContent(scratch) ? JSON.stringify(scratch) : null);
    notify();
}

export function clearScratch() {
    store(null);
    notify();
}

function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

export function useScratchRequest(): ScratchRequest | null {
    return useSyncExternalStore(subscribe, readScratch);
}
