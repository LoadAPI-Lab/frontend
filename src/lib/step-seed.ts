import { z } from 'zod';

import type { ApiSpecResponseDtoEndpointsItem } from '@/api/generated/model';

import { draftFromEndpoint } from './endpoint-request';
import { HTTP_METHODS } from './http-method';
import { buildRequest } from './request-draft';

export const STEP_SEED_MIME = 'application/x-routelab-step';

const stepSeedSchema = z.object({
    method: z.enum(HTTP_METHODS),
    url: z.string(),
    headers: z.record(z.string(), z.string()).optional(),
    body: z.string().optional(),
});

export type StepSeed = z.infer<typeof stepSeedSchema>;

const joinUrl = (base: string, path: string) => `${base.replace(/\/+$/, '')}${path}`;

export function seedFromEndpoint(
    endpoint: ApiSpecResponseDtoEndpointsItem,
    baseUrl: string,
): StepSeed {
    const draft = draftFromEndpoint(endpoint);
    const method = HTTP_METHODS.find((known) => known === endpoint.method.toUpperCase()) ?? 'GET';
    const built = buildRequest({ method, url: joinUrl(baseUrl, endpoint.path) }, draft);
    const withBody = draft.body.trim() !== '';
    const contentType = endpoint.requestBody?.contentType;
    const headers = { ...built.headers };
    const hasContentType = Object.keys(headers).some(
        (name) => name.toLowerCase() === 'content-type',
    );
    if (withBody && contentType && !hasContentType) {
        headers['Content-Type'] = contentType;
    }
    return {
        method,
        url: built.url,
        ...(Object.keys(headers).length > 0 ? { headers } : {}),
        ...(withBody ? { body: draft.body } : {}),
    };
}

export function parseStepSeed(text: string): StepSeed | null {
    try {
        const parsed = stepSeedSchema.safeParse(JSON.parse(text));
        return parsed.success ? parsed.data : null;
    } catch {
        return null;
    }
}

type Listener = (seed: StepSeed) => void;

const listeners = new Set<Listener>();

export function pickStep(seed: StepSeed) {
    for (const listener of listeners) {
        listener(seed);
    }
}

export function onStepPicked(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}
