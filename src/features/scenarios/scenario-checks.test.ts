import { describe, expect, it } from 'vitest';

import { newRow } from '@/lib/request-draft';

import { checkScenario } from './scenario-checks';
import { type ScenarioDraft, type StepDraft, stepFromSeed } from './scenario-draft';

const step = (
    method: StepDraft['method'],
    url: string,
    { body = '', extract = [] as [string, string][], headers = [] as [string, string][] } = {},
): StepDraft => ({
    ...stepFromSeed({ method, url, body }),
    headers: headers.map(([key, value]) => newRow(key, value)),
    extract: extract.map(([name, path]) => newRow(name, path)),
});

const draft = (...steps: StepDraft[]): ScenarioDraft => ({ name: 'Flow', steps });

describe('checkScenario', () => {
    it('accepts variables extracted by an earlier step', () => {
        const checks = checkScenario(
            draft(
                step('POST', 'http://api.test/tasks', {
                    body: '{"title":"{{$uuid}}"}',
                    extract: [['taskId', 'data.id']],
                }),
                step('GET', 'http://api.test/tasks/{{taskId}}'),
            ),
        );
        expect(checks.steps).toEqual([[], []]);
        expect(checks.canRun).toBe(true);
        expect(checks.variables).toEqual([
            { name: 'taskId', step: 1, path: 'data.id', usedBy: [2] },
        ]);
    });

    it('flags a variable used before any step extracts it, per step', () => {
        const checks = checkScenario(
            draft(
                step('GET', 'http://api.test/tasks/{{taskId}}', {
                    headers: [['Authorization', 'Bearer {{token}}']],
                }),
                step('POST', 'http://api.test/tasks', { extract: [['taskId', 'data.id']] }),
            ),
        );
        expect(checks.steps[0]).toEqual([
            { kind: 'undefinedVariable', name: 'taskId', laterStep: 2 },
            { kind: 'undefinedVariable', name: 'token' },
        ]);
        expect(checks.steps[1]).toEqual([]);
        expect(checks.undefinedVariables).toEqual(['taskId', 'token']);
        expect(checks.canRun).toBe(false);
    });

    it('does not let a step use the variable it extracts itself', () => {
        const checks = checkScenario(
            draft(step('GET', 'http://api.test/me/{{id}}', { extract: [['id', 'id']] })),
        );
        expect(checks.steps[0]).toEqual([{ kind: 'undefinedVariable', name: 'id' }]);
    });

    it('ignores the body of a GET step', () => {
        const checks = checkScenario(
            draft(step('GET', 'http://api.test/tasks', { body: '{"broken": {{nope}}' })),
        );
        expect(checks.steps[0]).toEqual([]);
    });

    it('reports URL, path parameter, body, placeholder and extract problems', () => {
        const checks = checkScenario(
            draft(
                step('GET', '/tasks'),
                step('GET', 'http://api.test/tasks/{id}'),
                step('POST', 'http://api.test/tasks', {
                    body: '{"a": {{$nope}}}',
                    extract: [
                        ['bad-name', 'id'],
                        ['ok', ' '],
                    ],
                }),
            ),
        );
        expect(checks.steps[0]).toEqual([{ kind: 'noUrl' }]);
        expect(checks.steps[1]).toEqual([{ kind: 'pathParam', param: '{id}' }]);
        expect(checks.steps[2]).toEqual([
            { kind: 'unknownGenerator', name: 'nope' },
            { kind: 'invalidBody' },
            { kind: 'extractName', name: 'bad-name' },
            { kind: 'extractPath', name: 'ok' },
        ]);
    });

    it('needs steps to run and a name to save', () => {
        expect(checkScenario({ name: 'Empty', steps: [] })).toMatchObject({
            scenario: [{ kind: 'noSteps' }],
            canRun: false,
            canSave: false,
        });
        const unnamed = checkScenario({ name: ' ', steps: [step('GET', 'http://api.test/')] });
        expect(unnamed).toMatchObject({ canRun: true, canSave: false });
        expect(unnamed.scenario).toEqual([{ kind: 'noName' }]);
    });
});
