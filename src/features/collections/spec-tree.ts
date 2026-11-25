import type { Endpoint } from './api';

export interface TagFolder {
    tag: string;
    endpoints: Endpoint[];
}

export interface SpecGroups {
    folders: TagFolder[];
    untagged: Endpoint[];
}

export function groupEndpoints(endpoints: Endpoint[]): SpecGroups {
    const folders = new Map<string, Endpoint[]>();
    const untagged: Endpoint[] = [];
    for (const endpoint of endpoints) {
        const [tag] = endpoint.tags;
        if (tag) {
            folders.set(tag, [...(folders.get(tag) ?? []), endpoint]);
        } else {
            untagged.push(endpoint);
        }
    }
    return {
        folders: [...folders].map(([tag, list]) => ({ tag, endpoints: list })),
        untagged,
    };
}

export const specNodeId = (specId: string) => `spec:${specId}`;
export const folderNodeId = (specId: string, tag: string) => `folder:${specId}:${tag}`;
export const endpointNodeId = (specId: string, key: string) => `endpoint:${specId}:${key}`;

export function specInitials(name: string): string {
    const words = name
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .split(/[^A-Za-z0-9]+/)
        .filter(Boolean);
    const [first = '', second] = words;
    if (second) {
        return `${first.charAt(0)}${second.charAt(0)}`.toUpperCase();
    }
    const consonant = first.slice(1).match(/[^aeiouAEIOU0-9]/)?.[0] ?? first.charAt(1);
    return `${first.charAt(0)}${consonant}`.toUpperCase();
}

const isParamSegment = (segment: string) => /^\{[^}]+\}$|^:\w+$/.test(segment);

export function splitDisplayPath(path: string): { head: string; tail: string } {
    const segments = path.split('/');
    let keep = 1;
    const last = segments.at(-1) ?? '';
    if ((isParamSegment(last) || last === '') && segments.length > 3) {
        keep = 2;
    }
    const tailStart = Math.max(1, segments.length - keep);
    if (tailStart <= 1) {
        return { head: '', tail: path };
    }
    return {
        head: segments.slice(0, tailStart).join('/'),
        tail: `/${segments.slice(tailStart).join('/')}`,
    };
}

export function searchTerms(query: string): string[] {
    return query.trim().toLowerCase().split(/\s+/).filter(Boolean);
}

export function endpointMatches(endpoint: Endpoint, terms: readonly string[]): boolean {
    const haystack = `${endpoint.method} ${endpoint.path} ${endpoint.summary ?? ''}`.toLowerCase();
    return terms.every((term) => haystack.includes(term));
}

export type Range = readonly [start: number, end: number];

export function matchRanges(text: string, terms: readonly string[]): Range[] {
    const lower = text.toLowerCase();
    const ranges: [number, number][] = [];
    for (const term of terms) {
        let from = lower.indexOf(term);
        while (from !== -1) {
            ranges.push([from, from + term.length]);
            from = lower.indexOf(term, from + term.length);
        }
    }
    ranges.sort((a, b) => a[0] - b[0]);
    const merged: [number, number][] = [];
    for (const range of ranges) {
        const previous = merged.at(-1);
        if (previous && range[0] <= previous[1]) {
            previous[1] = Math.max(previous[1], range[1]);
        } else {
            merged.push([range[0], range[1]]);
        }
    }
    return merged;
}
