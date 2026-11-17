import type { TestRunResponseDto } from '@/api/generated/model';

import type { RunListItem } from './history-api';

type RunConfig = TestRunResponseDto['config'];
type RunResult = NonNullable<TestRunResponseDto['result']>;

export type ScenarioConfig = Extract<RunConfig, { steps: unknown }>;
export type ScenarioResult = Extract<RunResult, { summary: unknown }>;
export type ScenarioStepResult = ScenarioResult['steps'][number];
export type ScenarioStepStatus = ScenarioStepResult['status'];

export const isScenarioConfig = (config: RunConfig): config is ScenarioConfig => 'steps' in config;

export const scenarioResultOf = (run: Pick<TestRunResponseDto, 'result'> | undefined) =>
    run?.result && 'summary' in run.result ? run.result : null;

export interface TimelineStep {
    index: number;
    method: string;
    url: string;
    status: ScenarioStepStatus;
    statusCode?: number;
    durationMs?: number;
    startMs: number;
}

export function timelineSteps(result: ScenarioResult): TimelineStep[] {
    let elapsed = 0;
    return result.steps.map((step, index) => {
        const startMs = elapsed;
        elapsed += step.durationMs ?? 0;
        return {
            index,
            method: step.method,
            url: step.url,
            status: step.status,
            ...(step.statusCode === undefined ? {} : { statusCode: step.statusCode }),
            ...(step.durationMs === undefined ? {} : { durationMs: step.durationMs }),
            startMs,
        };
    });
}

const variableRe = /\{\{(\w+)\}\}/g;

function usedNames(step: ScenarioConfig['steps'][number]): Set<string> {
    const texts = [
        step.target.url,
        step.target.body ?? '',
        ...Object.values(step.target.headers ?? {}),
    ];
    return new Set(
        texts.flatMap((text) => [...text.matchAll(variableRe)].map((match) => match[1] ?? '')),
    );
}

export interface ScenarioVariable {
    name: string;
    path: string;
    from: number;
    usedIn: number[];
}

export function scenarioVariables(config: ScenarioConfig): ScenarioVariable[] {
    const used = config.steps.map(usedNames);
    return config.steps.flatMap((step, from) =>
        (step.extract ?? []).map((rule) => ({
            name: rule.name,
            path: rule.path,
            from,
            usedIn: used.flatMap((names, index) =>
                index > from && names.has(rule.name) ? [index] : [],
            ),
        })),
    );
}

function urlShape(url: string) {
    const [base = '', query] = url.split('?', 2);
    if (query === undefined) {
        return base;
    }
    const keys = query
        .split('&')
        .map((pair) => pair.split('=', 1)[0] ?? '')
        .toSorted();
    return `${base}?${keys.join('&')}`;
}

export const stepSignature = (config: ScenarioConfig) =>
    JSON.stringify(config.steps.map((step) => [step.target.method, urlShape(step.target.url)]));

export const SCENARIO_RUN_CANDIDATES = 12;

export function scenarioCandidates(
    items: readonly RunListItem[],
    runId: string,
    stepsCount: number,
): RunListItem[] {
    const index = items.findIndex((item) => item.id === runId);
    if (index === -1) {
        return [];
    }
    return items
        .slice(index + 1)
        .filter((item) => item.type === 'scenario' && item.stepsCount === stepsCount)
        .slice(0, SCENARIO_RUN_CANDIDATES);
}

export function sameScenarioRuns(
    run: TestRunResponseDto,
    candidates: readonly (TestRunResponseDto | undefined)[],
    count: number,
): TestRunResponseDto[] {
    if (!isScenarioConfig(run.config)) {
        return [run];
    }
    const signature = stepSignature(run.config);
    const matches = candidates.filter(
        (candidate): candidate is TestRunResponseDto =>
            candidate !== undefined &&
            isScenarioConfig(candidate.config) &&
            stepSignature(candidate.config) === signature,
    );
    return [run, ...matches].slice(0, count);
}

export const stepNumber = (index: number) => String(index + 1).padStart(2, '0');

export function firstStepWith(result: ScenarioResult, status: ScenarioStepStatus) {
    const index = result.steps.findIndex((step) => step.status === status);
    return index === -1 ? null : index;
}
