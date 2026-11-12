import { z } from 'zod';

import type { EndpointPlace } from './run-memory';

const KEY = 'routelab.tests.bodies';
const MAX_BODIES = 50;

const memorySchema = z.record(z.string(), z.string());

type Memory = z.infer<typeof memorySchema>;

const placeKey = ({ spec, endpoint }: EndpointPlace) => `${spec}|${endpoint}`;

function read(): Memory {
    try {
        const parsed = memorySchema.safeParse(JSON.parse(sessionStorage.getItem(KEY) ?? '{}'));
        return parsed.success ? parsed.data : {};
    } catch {
        return {};
    }
}

function write(memory: Memory) {
    try {
        sessionStorage.setItem(KEY, JSON.stringify(memory));
    } catch {
        return;
    }
}

const without = (memory: Memory, key: string) =>
    Object.entries(memory).filter(([candidate]) => candidate !== key);

export function rememberEditedBody(place: EndpointPlace, body: string) {
    const key = placeKey(place);
    write(Object.fromEntries([...without(read(), key), [key, body]].slice(-MAX_BODIES)));
}

export function forgetEditedBody(place: EndpointPlace) {
    const memory = read();
    const key = placeKey(place);
    if (key in memory) {
        write(Object.fromEntries(without(memory, key)));
    }
}

export const editedBodyFor = (place: EndpointPlace): string | undefined => read()[placeKey(place)];
