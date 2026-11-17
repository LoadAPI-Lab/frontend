import { validateJsonBody } from '@/lib/json-body';
import { findPlaceholders } from '@/lib/placeholders';
import { unresolvedPathParam } from '@/lib/target-url';

import { type ScenarioDraft, sendsBody, type StepDraft } from './scenario-draft';

export const MAX_STEPS = 50;
export const MAX_NAME_LENGTH = 255;
const VARIABLE_NAME_RE = /^\w+$/;

export type StepIssue =
    | { kind: 'noUrl' }
    | { kind: 'pathParam'; param: string }
    | { kind: 'undefinedVariable'; name: string; laterStep?: number }
    | { kind: 'unknownGenerator'; name: string }
    | { kind: 'invalidBody' }
    | { kind: 'extractName'; name: string }
    | { kind: 'extractPath'; name: string };

export type ScenarioIssue = { kind: 'noSteps' } | { kind: 'tooManySteps' } | { kind: 'noName' };

export interface ScenarioVariable {
    name: string;
    step: number;
    path: string;
    usedBy: number[];
}

export interface ScenarioChecks {
    steps: StepIssue[][];
    scenario: ScenarioIssue[];
    variables: ScenarioVariable[];
    undefinedVariables: string[];
    canRun: boolean;
    canSave: boolean;
}

function stepTexts(step: StepDraft): string[] {
    return [
        step.url,
        ...(sendsBody(step.method) ? [step.body] : []),
        ...step.headers.filter((row) => row.key.trim() !== '').map((row) => row.value),
    ];
}

function unique(values: string[]): string[] {
    return [...new Set(values)];
}

export function usedVariables(step: StepDraft): string[] {
    return unique(
        stepTexts(step).flatMap((text) =>
            findPlaceholders(text)
                .filter((placeholder) => placeholder.kind === 'variable')
                .map((placeholder) => placeholder.name),
        ),
    );
}

function unknownGenerators(step: StepDraft): string[] {
    return unique(
        stepTexts(step).flatMap((text) =>
            findPlaceholders(text)
                .filter((placeholder) => placeholder.kind === 'generator' && !placeholder.known)
                .map((placeholder) => placeholder.name),
        ),
    );
}

const extractRules = (step: StepDraft) =>
    step.extract.filter((rule) => rule.key.trim() !== '' || rule.value.trim() !== '');

export const extractedNames = (step: StepDraft) =>
    extractRules(step)
        .map((rule) => rule.key.trim())
        .filter((name) => VARIABLE_NAME_RE.test(name));

function firstExtractor(steps: StepDraft[], name: string, after: number): number | undefined {
    const index = steps.findIndex(
        (step, position) => position > after && extractedNames(step).includes(name),
    );
    return index === -1 ? undefined : index + 1;
}

function issuesOf(step: StepDraft, index: number, steps: StepDraft[], known: Set<string>) {
    const issues: StepIssue[] = [];
    const url = step.url.trim();
    if (!/^https?:\/\/[^/\s]/i.test(url)) {
        issues.push({ kind: 'noUrl' });
    } else {
        const param = unresolvedPathParam(url);
        if (param) {
            issues.push({ kind: 'pathParam', param });
        }
    }
    for (const name of usedVariables(step)) {
        if (!known.has(name)) {
            const laterStep = firstExtractor(steps, name, index);
            issues.push(
                laterStep === undefined
                    ? { kind: 'undefinedVariable', name }
                    : { kind: 'undefinedVariable', name, laterStep },
            );
        }
    }
    for (const name of unknownGenerators(step)) {
        issues.push({ kind: 'unknownGenerator', name });
    }
    if (sendsBody(step.method) && validateJsonBody(step.body).length > 0) {
        issues.push({ kind: 'invalidBody' });
    }
    for (const rule of extractRules(step)) {
        const name = rule.key.trim();
        if (!VARIABLE_NAME_RE.test(name)) {
            issues.push({ kind: 'extractName', name });
        } else if (rule.value.trim() === '') {
            issues.push({ kind: 'extractPath', name });
        }
    }
    return issues;
}

export function checkScenario(draft: ScenarioDraft): ScenarioChecks {
    const known = new Set<string>();
    const variables: ScenarioVariable[] = [];
    const undefinedVariables: string[] = [];
    const steps = draft.steps.map((step, index) => {
        const issues = issuesOf(step, index, draft.steps, known);
        for (const name of usedVariables(step)) {
            const source = variables.findLast((variable) => variable.name === name);
            if (source && known.has(name)) {
                source.usedBy.push(index + 1);
            } else if (!undefinedVariables.includes(name)) {
                undefinedVariables.push(name);
            }
        }
        for (const rule of extractRules(step)) {
            const name = rule.key.trim();
            if (VARIABLE_NAME_RE.test(name)) {
                known.add(name);
                variables.push({ name, step: index + 1, path: rule.value.trim(), usedBy: [] });
            }
        }
        return issues;
    });

    const scenario: ScenarioIssue[] = [];
    if (draft.steps.length === 0) {
        scenario.push({ kind: 'noSteps' });
    }
    if (draft.steps.length > MAX_STEPS) {
        scenario.push({ kind: 'tooManySteps' });
    }
    const runnable = scenario.length === 0 && steps.every((issues) => issues.length === 0);
    const named = draft.name.trim() !== '';
    if (!named) {
        scenario.push({ kind: 'noName' });
    }

    return {
        steps,
        scenario,
        variables,
        undefinedVariables,
        canRun: runnable,
        canSave: runnable && named,
    };
}

export const issueCount = (checks: ScenarioChecks) =>
    checks.steps.reduce((total, issues) => total + issues.length, 0) +
    checks.scenario.filter((issue) => issue.kind !== 'noName').length;
