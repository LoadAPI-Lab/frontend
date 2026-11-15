import { useSyncExternalStore } from 'react';
import { z } from 'zod';

import { HTTP_METHODS } from '@/lib/http-method';

import type { ScenarioDraft } from './scenario-draft';

const KEY = 'routelab.scenarios';

export const NEW_SCENARIO = 'new';

const rowSchema = z.object({ id: z.string(), key: z.string(), value: z.string() });

const draftSchema: z.ZodType<ScenarioDraft> = z.object({
    name: z.string(),
    steps: z.array(
        z.object({
            id: z.string(),
            method: z.enum(HTTP_METHODS),
            url: z.string(),
            headers: z.array(rowSchema),
            body: z.string(),
            extract: z.array(rowSchema),
        }),
    ),
});

const runSchema = z.object({
    runId: z.string(),
    fingerprint: z.string(),
    outcome: z.enum(['passed', 'failed']).optional(),
});

export type ScenarioRunMemory = z.infer<typeof runSchema>;

const stateSchema = z.object({
    drafts: z.record(z.string(), draftSchema).default({}),
    runs: z.record(z.string(), runSchema).default({}),
});

type State = z.infer<typeof stateSchema>;

const EMPTY: State = { drafts: {}, runs: {} };

let state: State | null = null;
const listeners = new Set<() => void>();

function load(): State {
    try {
        const parsed = stateSchema.safeParse(JSON.parse(sessionStorage.getItem(KEY) ?? '{}'));
        return parsed.success ? parsed.data : EMPTY;
    } catch {
        return EMPTY;
    }
}

function current(): State {
    state ??= load();
    return state;
}

function persist(value: State) {
    try {
        sessionStorage.setItem(KEY, JSON.stringify(value));
    } catch {
        return;
    }
}

function update(change: (previous: State) => State) {
    const next = change(current());
    state = next;
    persist(next);
    for (const listener of listeners) {
        listener();
    }
}

function without<T>(record: Record<string, T>, key: string): Record<string, T> {
    return Object.fromEntries(Object.entries(record).filter(([other]) => other !== key));
}

export function saveDraft(key: string, draft: ScenarioDraft) {
    update((previous) => ({ ...previous, drafts: { ...previous.drafts, [key]: draft } }));
}

export function dropDraft(key: string) {
    update((previous) => ({ ...previous, drafts: without(previous.drafts, key) }));
}

export function rememberScenarioRun(key: string, run: ScenarioRunMemory) {
    update((previous) => ({ ...previous, runs: { ...previous.runs, [key]: run } }));
}

export function setRunOutcome(key: string, runId: string, outcome: 'passed' | 'failed') {
    update((previous) => {
        const run = previous.runs[key];
        if (run?.runId !== runId || run.outcome === outcome) {
            return previous;
        }
        return { ...previous, runs: { ...previous.runs, [key]: { ...run, outcome } } };
    });
}

export function moveScenarioMemory(from: string, to: string) {
    update((previous) => {
        const run = previous.runs[from];
        return {
            drafts: without(previous.drafts, from),
            runs: run ? { ...without(previous.runs, from), [to]: run } : previous.runs,
        };
    });
}

export function forgetScenario(key: string) {
    update((previous) => ({
        drafts: without(previous.drafts, key),
        runs: without(previous.runs, key),
    }));
}

export function resetScenarioStore() {
    state = null;
}

function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

export function useScenarioStore(): State {
    return useSyncExternalStore(subscribe, current);
}
