import type { RunListItem } from './history-api';
import { runPath } from './history-format';

function safeDecode(value: string): string {
    try {
        return decodeURI(value);
    } catch {
        return value;
    }
}

export const normalizeQuery = (query: string | undefined) => query?.trim().toLowerCase() ?? '';

export function matchesSearch(run: RunListItem, query?: string): boolean {
    const needle = normalizeQuery(query);
    if (!needle) {
        return true;
    }
    if (!run.request) {
        return false;
    }
    const { method, url } = run.request;
    return `${method} ${runPath(url)}`.toLowerCase().includes(needle);
}

export const filterRuns = (items: readonly RunListItem[], query?: string) =>
    items.filter((run) => matchesSearch(run, query));

function pathOf(url: string): string {
    try {
        return safeDecode(new URL(url).pathname);
    } catch {
        return url.split('?')[0] ?? url;
    }
}

export interface EndpointGroup {
    key: string;
    method?: string;
    path?: string;
    type: RunListItem['type'];
    runs: RunListItem[];
    latest: RunListItem;
}

export function endpointKey(run: RunListItem): string {
    if (run.type === 'single' && run.request) {
        return `${run.request.method.toUpperCase()} ${pathOf(run.request.url)}`;
    }
    return `type:${run.type}`;
}

export function groupByEndpoint(items: readonly RunListItem[]): EndpointGroup[] {
    const groups = new Map<string, EndpointGroup>();
    for (const run of items) {
        const key = endpointKey(run);
        const group = groups.get(key);
        if (group) {
            group.runs.push(run);
            continue;
        }
        const route =
            run.type === 'single' && run.request
                ? { method: run.request.method.toUpperCase(), path: pathOf(run.request.url) }
                : {};
        groups.set(key, { key, ...route, type: run.type, runs: [run], latest: run });
    }
    return [...groups.values()];
}
