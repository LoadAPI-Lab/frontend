export interface KeyValueRow {
    id: string;
    key: string;
    value: string;
}

export type ApiKeyLocation = 'header' | 'query';

export type AuthConfig =
    | { kind: 'none' }
    | { kind: 'bearer'; token: string }
    | { kind: 'basic'; username: string; password: string }
    | { kind: 'apiKey'; name: string; value: string; location: ApiKeyLocation };

export type AuthKind = AuthConfig['kind'];

export interface RequestDraft {
    body: string;
    headers: KeyValueRow[];
    query: KeyValueRow[];
    pathParams: Record<string, string>;
    auth: AuthConfig;
}

export interface RequestRoute {
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
    url: string;
}

export interface BuiltRequest extends RequestRoute {
    headers?: Record<string, string>;
}

export const newRow = (key = '', value = ''): KeyValueRow => ({
    id: crypto.randomUUID(),
    key,
    value,
});

export const emptyDraft = (): RequestDraft => ({
    body: '',
    headers: [],
    query: [],
    pathParams: {},
    auth: { kind: 'none' },
});

export function emptyAuth(kind: AuthKind): AuthConfig {
    if (kind === 'bearer') {
        return { kind, token: '' };
    }
    if (kind === 'basic') {
        return { kind, username: '', password: '' };
    }
    if (kind === 'apiKey') {
        return { kind, name: '', value: '', location: 'header' };
    }
    return { kind: 'none' };
}

const PATH_PARAM_RE = /^(?::(\w+)|\{(\w+)\})$/;

function splitUrl(url: string): { path: string; rest: string } {
    const index = url.search(/[?#]/);
    return index === -1
        ? { path: url, rest: '' }
        : { path: url.slice(0, index), rest: url.slice(index) };
}

export function pathParamNames(url: string): string[] {
    const names = splitUrl(url)
        .path.split('/')
        .map((segment) => PATH_PARAM_RE.exec(segment))
        .map((match) => match?.[1] ?? match?.[2])
        .filter((name): name is string => Boolean(name));
    return [...new Set(names)];
}

function fillPath(url: string, values: Record<string, string>): string {
    const { path, rest } = splitUrl(url);
    const filled = path
        .split('/')
        .map((segment) => {
            const match = PATH_PARAM_RE.exec(segment);
            const name = match?.[1] ?? match?.[2];
            const value = name ? values[name]?.trim() : undefined;
            return value ? encodeURIComponent(value) : segment;
        })
        .join('/');
    return filled + rest;
}

function appendQuery(url: string, pairs: [string, string][]): string {
    if (pairs.length === 0) {
        return url;
    }
    const hashIndex = url.indexOf('#');
    const base = hashIndex === -1 ? url : url.slice(0, hashIndex);
    const hash = hashIndex === -1 ? '' : url.slice(hashIndex);
    const query = new URLSearchParams(pairs).toString();
    return `${base}${base.includes('?') ? '&' : '?'}${query}${hash}`;
}

function base64(text: string): string {
    const bytes = new TextEncoder().encode(text);
    let binary = '';
    for (const byte of bytes) {
        binary += String.fromCharCode(byte);
    }
    return btoa(binary);
}

const filled = (rows: KeyValueRow[]): [string, string][] =>
    rows.filter((row) => row.key.trim() !== '').map((row) => [row.key.trim(), row.value]);

function setHeader(headers: Record<string, string>, name: string, value: string) {
    for (const existing of Object.keys(headers)) {
        if (existing.toLowerCase() === name.toLowerCase()) {
            Reflect.deleteProperty(headers, existing);
        }
    }
    headers[name] = value;
}

export function buildRequest(route: RequestRoute, draft: RequestDraft): BuiltRequest {
    const headers: Record<string, string> = Object.fromEntries(filled(draft.headers));
    const query = filled(draft.query);
    const { auth } = draft;

    if (auth.kind === 'bearer' && auth.token.trim() !== '') {
        setHeader(headers, 'Authorization', `Bearer ${auth.token.trim()}`);
    }
    if (auth.kind === 'basic' && (auth.username !== '' || auth.password !== '')) {
        setHeader(headers, 'Authorization', `Basic ${base64(`${auth.username}:${auth.password}`)}`);
    }
    if (auth.kind === 'apiKey' && auth.name.trim() !== '') {
        if (auth.location === 'header') {
            setHeader(headers, auth.name.trim(), auth.value);
        } else {
            query.push([auth.name.trim(), auth.value]);
        }
    }

    const url = appendQuery(fillPath(route.url, draft.pathParams), query);
    return Object.keys(headers).length > 0
        ? { method: route.method, url, headers }
        : { method: route.method, url };
}

export const headerCount = (draft: RequestDraft) => filled(draft.headers).length;

export const paramCount = (draft: RequestDraft) =>
    filled(draft.query).length +
    Object.values(draft.pathParams).filter((value) => value.trim() !== '').length;
