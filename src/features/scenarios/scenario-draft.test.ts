import { describe, expect, it } from 'vitest';

import { taskLifecycleScenario } from '@/mocks/scenarios';

import {
    draftFromScenario,
    duplicateStep,
    moveStep,
    sameScenario,
    stepFromSeed,
    toConfig,
} from './scenario-draft';

describe('scenario drafts', () => {
    it('round-trips a saved scenario through a draft', () => {
        const draft = draftFromScenario(taskLifecycleScenario);
        expect(toConfig(draft)).toEqual(taskLifecycleScenario.config);
        expect(sameScenario(draft, taskLifecycleScenario)).toBe(true);
    });

    it('gives a saved scenario stable ids', () => {
        const first = draftFromScenario(taskLifecycleScenario);
        const second = draftFromScenario(taskLifecycleScenario);
        expect(second.steps.map((step) => step.id)).toEqual(first.steps.map((step) => step.id));
    });

    it('drops empty rows, trims names and leaves out the body of GET', () => {
        const step = {
            ...stepFromSeed({ method: 'GET', url: ' http://api.test/a ', body: '{"x":1}' }),
            headers: [
                { id: 'h1', key: ' X-Trace ', value: '1' },
                { id: 'h2', key: '', value: 'ignored' },
            ],
            extract: [
                { id: 'x1', key: ' id ', value: ' data.id ' },
                { id: 'x2', key: '', value: '' },
            ],
        };
        expect(toConfig({ name: 'A', steps: [step] })).toEqual({
            steps: [
                {
                    target: {
                        method: 'GET',
                        url: 'http://api.test/a',
                        headers: { 'X-Trace': '1' },
                    },
                    extract: [{ name: 'id', path: 'data.id' }],
                },
            ],
        });
    });

    it('notices a renamed or edited scenario', () => {
        const draft = draftFromScenario(taskLifecycleScenario);
        expect(sameScenario({ ...draft, name: 'Other' }, taskLifecycleScenario)).toBe(false);
        expect(sameScenario({ ...draft, steps: draft.steps.slice(1) }, taskLifecycleScenario)).toBe(
            false,
        );
    });

    it('moves and duplicates steps', () => {
        const steps = draftFromScenario(taskLifecycleScenario).steps;
        const moved = moveStep(steps, 0, 1);
        expect(moved.map((step) => step.url)).toEqual([
            steps[1]?.url,
            steps[0]?.url,
            steps[2]?.url,
            steps[3]?.url,
        ]);
        expect(moveStep(steps, 0, -1)).toBe(steps);
        const copied = duplicateStep(steps, 1);
        expect(copied).toHaveLength(5);
        expect(copied[2]?.url).toBe(steps[1]?.url);
        expect(copied[2]?.id).not.toBe(steps[1]?.id);
    });
});
