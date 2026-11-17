import { describe, expect, it } from 'vitest';

import type { SendRequestResponseDto } from '@/api/generated/model';
import { newRow } from '@/lib/request-draft';

import { checkScenario } from './scenario-checks';
import { type StepDraft, stepFromSeed } from './scenario-draft';
import { sendBlockFor, stepRequest, type StepSend, valuesBeforeEach } from './use-step-sends';

const login: StepDraft = {
    ...stepFromSeed({ method: 'POST', url: 'http://api.dev/auth/login', body: '{}' }),
    extract: [newRow('token', 'accessToken')],
};
const create: StepDraft = {
    ...stepFromSeed({
        method: 'POST',
        url: 'http://api.dev/tasks',
        headers: { Authorization: 'Bearer {{token}}' },
        body: '{"title":"{{token}}-{{$uuid}}"}',
    }),
    extract: [newRow('taskId', 'data.id')],
};
const read = stepFromSeed({ method: 'GET', url: 'http://api.dev/tasks/{{taskId}}', body: 'x' });
const steps = [login, create, read];

const responded = (body: string): StepSend => {
    const outcome: SendRequestResponseDto = {
        kind: 'response',
        status: 200,
        headers: [],
        body,
        sizeBytes: body.length,
        durationMs: 10,
    };
    return { sending: false, outcome, problem: null };
};

describe('stepRequest', () => {
    it('fills variables and leaves generators for core', () => {
        expect(stepRequest(create, { token: 'abc' })).toEqual({
            method: 'POST',
            url: 'http://api.dev/tasks',
            headers: { Authorization: 'Bearer abc' },
            body: '{"title":"abc-{{$uuid}}"}',
        });
    });

    it('drops the body for GET', () => {
        expect(stepRequest(read, { taskId: '7' })).toEqual({
            method: 'GET',
            url: 'http://api.dev/tasks/7',
        });
    });
});

describe('valuesBeforeEach', () => {
    it('collects values from responses of earlier steps', () => {
        const values = valuesBeforeEach(steps, {
            [login.id]: responded('{"accessToken":"abc"}'),
            [create.id]: responded('{"data":{"id":"task-1"}}'),
        });
        expect(values).toEqual([{}, { token: 'abc' }, { token: 'abc', taskId: 'task-1' }]);
    });
});

describe('sendBlockFor', () => {
    const issues = checkScenario({ name: 'x', steps }).steps;

    it('lets a step without variables send', () => {
        expect(sendBlockFor(steps, 0, issues[0] ?? [], {})).toBeNull();
    });

    it('points at the earlier step to send first', () => {
        expect(sendBlockFor(steps, 2, issues[2] ?? [], { token: 'abc' })).toEqual({
            kind: 'needsValues',
            names: ['taskId'],
            fromStep: 2,
        });
        expect(sendBlockFor(steps, 2, issues[2] ?? [], { taskId: '1' })).toBeNull();
    });

    it('blocks a step with problems', () => {
        const broken = [stepFromSeed({ method: 'GET', url: '' })];
        const brokenIssues = checkScenario({ name: 'x', steps: broken }).steps;
        expect(sendBlockFor(broken, 0, brokenIssues[0] ?? [], {})).toEqual({ kind: 'issues' });
    });
});
