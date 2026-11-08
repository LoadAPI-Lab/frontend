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
