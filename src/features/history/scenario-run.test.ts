import { describe, expect, it } from 'vitest';

import type { TestRunResponseDto } from '@/api/generated/model';

import type { RunListItem } from './history-api';
import {
    firstStepWith,
    isScenarioConfig,
    sameScenarioRuns,
    type ScenarioConfig,
    type ScenarioResult,
    scenarioCandidates,
    scenarioResultOf,
    scenarioVariables,
    stepNumber,
    timelineSteps,
} from './scenario-run';

const config: ScenarioConfig = {
    steps: [
        {
            target: { method: 'POST', url: 'http://api.test/tasks', body: '{"title":"x"}' },
            extract: [{ name: 'taskId', path: 'id' }],
        },
        { target: { method: 'GET', url: 'http://api.test/tasks/{{taskId}}' } },
        {
            target: {
                method: 'PATCH',
                url: 'http://api.test/tasks/{{taskId}}',
                headers: { 'X-Trace': '{{taskId}}' },
            },
            extract: [{ name: 'etag', path: 'meta.etag' }],
        },
    ],
};

const result: ScenarioResult = {
    summary: { totalSteps: 3, okCount: 1, failedCount: 1, skippedCount: 1, durationMs: 59 },
    steps: [
        {
            method: 'POST',
            url: 'http://api.test/tasks',
            status: 'OK',
            statusCode: 201,
            durationMs: 38,
        },
        {
            method: 'GET',
            url: 'http://api.test/tasks/1',
            status: 'FAILED',
            statusCode: 500,
            durationMs: 21,
            description: 'unexpected status 500',
        },
        {
            method: 'PATCH',
            url: 'http://api.test/tasks/1',
            status: 'SKIPPED',
            description: 'previous step failed',
        },
    ],
};

const run = (id: string, steps = config): TestRunResponseDto => ({
    id,
    type: 'scenario',
    status: 'COMPLETED',
    createdAt: '2026-11-16T10:00:00.000Z',
    config: steps,
    result,
});

const item = (id: string, type: 'single' | 'scenario', stepsCount?: number): RunListItem => ({
    id,
    type,
    status: 'COMPLETED',
    createdAt: '2026-11-16T10:00:00.000Z',
    ...(stepsCount === undefined ? {} : { stepsCount }),
});

describe('scenario run helpers', () => {
    it('tells scenario configs and results apart', () => {
        expect(isScenarioConfig(config)).toBe(true);
        expect(
            isScenarioConfig({
                target: { method: 'GET', url: 'http://api.test' },
                targetRps: 1,
                durationSeconds: 1,
            }),
        ).toBe(false);
        expect(scenarioResultOf(run('a'))).toBe(result);
        expect(scenarioResultOf({})).toBeNull();
    });

    it('lays steps out one after another', () => {
        expect(timelineSteps(result).map((step) => [step.startMs, step.durationMs])).toEqual([
            [0, 38],
            [38, 21],
            [59, undefined],
        ]);
    });

    it('finds where each variable comes from and which later steps use it', () => {
        expect(scenarioVariables(config)).toEqual([
            { name: 'taskId', path: 'id', from: 0, usedIn: [1, 2] },
            { name: 'etag', path: 'meta.etag', from: 2, usedIn: [] },
        ]);
    });

    it('finds the first failed and skipped steps', () => {
        expect(firstStepWith(result, 'FAILED')).toBe(1);
        expect(firstStepWith(result, 'SKIPPED')).toBe(2);
        expect(firstStepWith({ ...result, steps: [] }, 'FAILED')).toBeNull();
        expect(stepNumber(2)).toBe('03');
    });

    it('picks older scenario runs with the same number of steps', () => {
        const items = [
            item('newer', 'scenario', 3),
            item('this', 'scenario', 3),
            item('single', 'single'),
            item('other-size', 'scenario', 2),
            item('older', 'scenario', 3),
        ];
        expect(scenarioCandidates(items, 'this', 3).map((candidate) => candidate.id)).toEqual([
            'older',
        ]);
        expect(scenarioCandidates(items, 'missing', 3)).toEqual([]);
    });

    it('keeps only runs with the same steps, current run first', () => {
        const changed: ScenarioConfig = {
            steps: config.steps.map((step, index) =>
                index === 1 ? { target: { ...step.target, url: 'http://api.test/other' } } : step,
            ),
        };
        const matches = sameScenarioRuns(
            run('this'),
            [run('same-1'), undefined, run('changed', changed), run('same-2'), run('same-3')],
            3,
        );
        expect(matches.map((match) => match.id)).toEqual(['this', 'same-1', 'same-2']);
    });
});
