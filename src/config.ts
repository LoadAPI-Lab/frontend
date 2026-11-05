import { z } from 'zod';

declare global {
    interface Window {
        __ENV__?: Record<string, string | undefined>;
    }
}

const schema = z.object({
    API_BASE: z.string().default(''),
    API_MOCKING: z.stringbool().default(false),
    FEATURE_BATCH: z.stringbool().default(false),
    FEATURE_ROUND_ROBIN: z.stringbool().default(false),
});

const raw = {
    API_BASE: import.meta.env.VITE_API_BASE,
    API_MOCKING: import.meta.env.VITE_API_MOCKING,
    FEATURE_BATCH: import.meta.env.VITE_FEATURE_BATCH,
    FEATURE_ROUND_ROBIN: import.meta.env.VITE_FEATURE_ROUND_ROBIN,
    ...(typeof window === 'undefined' ? {} : window.__ENV__),
};

const env = schema.parse(raw);

export const config = {
    apiBase: env.API_BASE.replace(/\/$/, ''),
    apiMocking: env.API_MOCKING,
    features: {
        batch: env.FEATURE_BATCH,
        roundRobin: env.FEATURE_ROUND_ROBIN,
    },
} as const;
