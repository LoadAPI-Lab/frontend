import { z } from 'zod';

const KEY = 'routelab.tests.runs';
const MAX_PLACES = 20;

const placeSchema = z.object({ spec: z.string(), endpoint: z.string() });

const memorySchema = z.object({
    byEndpoint: z.record(z.string(), z.string()).default({}),
    places: z.record(z.string(), placeSchema).default({}),
});

export type RunPlace = z.infer<typeof placeSchema>;
type Memory = z.infer<typeof memorySchema>;

const endpointKey = ({ spec, endpoint }: RunPlace) => `${spec}|${endpoint}`;

function read(): Memory {
    try {
        const parsed = memorySchema.safeParse(JSON.parse(sessionStorage.getItem(KEY) ?? '{}'));
        return parsed.success ? parsed.data : { byEndpoint: {}, places: {} };
    } catch {
        return { byEndpoint: {}, places: {} };
    }
}

function write(memory: Memory) {
    try {
        sessionStorage.setItem(KEY, JSON.stringify(memory));
    } catch {
        return;
    }
}

export function rememberRun(runId: string, place: RunPlace) {
    const memory = read();
    const places = Object.entries(memory.places).filter(([id]) => id !== runId);
    write({
        byEndpoint: { ...memory.byEndpoint, [endpointKey(place)]: runId },
        places: Object.fromEntries([...places, [runId, place]].slice(-MAX_PLACES)),
    });
}

export function lastRunFor(place: RunPlace): string | undefined {
    return read().byEndpoint[endpointKey(place)];
}

export function placeOfRun(runId: string): RunPlace | undefined {
    return read().places[runId];
}
