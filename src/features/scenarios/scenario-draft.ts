import type { CreateScenarioDto, ScenarioResponseDto } from '@/api/generated/model';
import type { HttpMethod } from '@/lib/http-method';
import { type KeyValueRow, newRow } from '@/lib/request-draft';
import type { StepSeed } from '@/lib/step-seed';

export type ScenarioConfig = CreateScenarioDto['config'];
type ConfigStep = ScenarioConfig['steps'][number];

export interface StepDraft {
    id: string;
    method: HttpMethod;
    url: string;
    headers: KeyValueRow[];
    body: string;
    extract: KeyValueRow[];
}

export interface ScenarioDraft {
    name: string;
    steps: StepDraft[];
}

export const BODYLESS_METHODS: readonly HttpMethod[] = ['GET', 'HEAD'];

export const sendsBody = (method: HttpMethod) => !BODYLESS_METHODS.includes(method);

const rowsOf = (record: Record<string, string> | undefined) =>
    Object.entries(record ?? {}).map(([key, value]) => newRow(key, value));

export function stepFromSeed(seed?: StepSeed): StepDraft {
    return {
        id: crypto.randomUUID(),
        method: seed?.method ?? 'GET',
        url: seed?.url ?? '',
        headers: rowsOf(seed?.headers),
        body: seed?.body ?? '',
        extract: [],
    };
}

export const savedStepId = (scenarioId: string, index: number) => `${scenarioId}:${index}`;

const rowsWithIds = (prefix: string, pairs: [string, string][]) =>
    pairs.map(([key, value], index) => ({ id: `${prefix}${index}`, key, value }));

function stepFromConfig(step: ConfigStep, id: string): StepDraft {
    return {
        id,
        method: step.target.method,
        url: step.target.url,
        headers: rowsWithIds(`${id}:h`, Object.entries(step.target.headers ?? {})),
        body: step.target.body ?? '',
        extract: rowsWithIds(
            `${id}:x`,
            (step.extract ?? []).map((rule): [string, string] => [rule.name, rule.path]),
        ),
    };
}

export function draftFromScenario(
    scenario: Pick<ScenarioResponseDto, 'id' | 'name' | 'config'>,
): ScenarioDraft {
    return {
        name: scenario.name,
        steps: scenario.config.steps.map((step, index) =>
            stepFromConfig(step, savedStepId(scenario.id, index)),
        ),
    };
}

const filled = (rows: KeyValueRow[]) => rows.filter((row) => row.key.trim() !== '');

function stepToConfig(step: StepDraft): ConfigStep {
    const headers = Object.fromEntries(
        filled(step.headers).map((row) => [row.key.trim(), row.value]),
    );
    const body = sendsBody(step.method) && step.body.trim() !== '' ? step.body : undefined;
    const extract = step.extract
        .filter((rule) => rule.key.trim() !== '' || rule.value.trim() !== '')
        .map((rule) => ({ name: rule.key.trim(), path: rule.value.trim() }));
    return {
        target: {
            method: step.method,
            url: step.url.trim(),
            ...(Object.keys(headers).length > 0 ? { headers } : {}),
            ...(body === undefined ? {} : { body }),
        },
        ...(extract.length > 0 ? { extract } : {}),
    };
}

export const toConfig = (draft: ScenarioDraft): ScenarioConfig => ({
    steps: draft.steps.map(stepToConfig),
});

export const configFingerprint = (config: ScenarioConfig) => JSON.stringify(config);

export function sameScenario(
    draft: ScenarioDraft,
    saved: Pick<ScenarioResponseDto, 'id' | 'name' | 'config'>,
): boolean {
    return (
        draft.name.trim() === saved.name &&
        configFingerprint(toConfig(draft)) === configFingerprint(toConfig(draftFromScenario(saved)))
    );
}

export const hasContent = (draft: ScenarioDraft) =>
    draft.name.trim() !== '' || draft.steps.length > 0;

export function moveStep(steps: StepDraft[], from: number, to: number): StepDraft[] {
    if (to < 0 || to >= steps.length || from === to) {
        return steps;
    }
    const next = [...steps];
    const [moved] = next.splice(from, 1);
    if (moved) {
        next.splice(to, 0, moved);
    }
    return next;
}

export function duplicateStep(steps: StepDraft[], index: number): StepDraft[] {
    const step = steps[index];
    if (!step) {
        return steps;
    }
    const copy: StepDraft = {
        ...step,
        id: crypto.randomUUID(),
        headers: step.headers.map((row) => newRow(row.key, row.value)),
        extract: step.extract.map((row) => newRow(row.key, row.value)),
    };
    return [...steps.slice(0, index + 1), copy, ...steps.slice(index + 1)];
}

export function addExtractRule(step: StepDraft, name: string, path: string): StepDraft {
    const blank = step.extract.findIndex(
        (rule) => rule.key.trim() === '' && rule.value.trim() === '',
    );
    const extract =
        blank === -1
            ? [...step.extract, newRow(name, path)]
            : step.extract.map((rule, index) =>
                  index === blank ? { ...rule, key: name, value: path } : rule,
              );
    return { ...step, extract };
}
