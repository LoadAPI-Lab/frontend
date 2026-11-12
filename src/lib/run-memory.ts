import { z } from 'zod';

const KEY = 'routelab.tests.runs';
const MAX_PLACES = 20;
const SCRATCH_KEY = 'scratch';

const endpointPlaceSchema = z.object({ spec: z.string(), endpoint: z.string() });
const scratchPlaceSchema = z.object({ scratch: z.literal(true) });
const placeSchema = z.union([endpointPlaceSchema, scratchPlaceSchema]);

const memorySchema = z.object({
    byEndpoint: z.record(z.string(), z.string()).default({}),
    places: z.record(z.string(), placeSchema).default({}),
});

export type EndpointPlace = z.infer<typeof endpointPlaceSchema>;
export type ScratchPlace = z.infer<typeof scratchPlaceSchema>;
export type RunPlace = z.infer<typeof placeSchema>;
type Memory = z.infer<typeof memorySchema>;

export const SCRATCH_PLACE: ScratchPlace = { scratch: true };

export const isScratchPlace = (place: RunPlace | undefined): place is ScratchPlace =>
    place !== undefined && 'scratch' in place;

const placeKey = (place: RunPlace) =>
    isScratchPlace(place) ? SCRATCH_KEY : `${place.spec}|${place.endpoint}`;

export interface PlaceSearch {
    spec?: string;
    endpoint?: string;
    scratch?: 1;
}

export function placeSearch(place?: RunPlace): PlaceSearch {
    if (!place) {
        return {};
    }
    return isScratchPlace(place) ? { scratch: 1 } : { spec: place.spec, endpoint: place.endpoint };
}

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
        byEndpoint: { ...memory.byEndpoint, [placeKey(place)]: runId },
        places: Object.fromEntries([...places, [runId, place]].slice(-MAX_PLACES)),
    });
}

export function lastRunFor(place: RunPlace): string | undefined {
    return read().byEndpoint[placeKey(place)];
}

export function placeOfRun(runId: string): RunPlace | undefined {
    return read().places[runId];
}
