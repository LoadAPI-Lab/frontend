import { http, HttpResponse } from 'msw';
import { z } from 'zod';

import type { ScenarioResponseDto } from '@/api/generated/model';

import { coreError } from './core-error';

const BASE = 'http://testserver:8080';

export const taskLifecycleScenario: ScenarioResponseDto = {
    id: '0b6f8a52-3c1e-4d2a-9f7e-5a1c2b3d4e01',
    name: 'Task lifecycle',
    stepsCount: 4,
    createdAt: '2026-11-12T09:00:00.000Z',
    updatedAt: '2026-11-14T16:20:00.000Z',
    config: {
        steps: [
            {
                target: {
                    method: 'POST',
                    url: `${BASE}/auth/login`,
                    headers: { 'Content-Type': 'application/json' },
                    body: '{"email":"demo@example.com","password":"demo-password"}',
                },
                extract: [{ name: 'token', path: 'accessToken' }],
            },
            {
                target: {
                    method: 'POST',
                    url: `${BASE}/tasks`,
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: 'Bearer {{token}}',
                    },
                    body: '{"title":"task-{{$uuid}}","status":"todo"}',
                },
                extract: [{ name: 'taskId', path: 'data.id' }],
            },
            {
                target: {
                    method: 'GET',
                    url: `${BASE}/tasks/{{taskId}}`,
                    headers: { Authorization: 'Bearer {{token}}' },
                },
            },
            {
                target: {
                    method: 'DELETE',
                    url: `${BASE}/tasks/{{taskId}}`,
                    headers: { Authorization: 'Bearer {{token}}' },
                },
            },
        ],
    },
};

const bodySchema = z.object({
    name: z.string().min(1).max(255),
    config: z.object({
        steps: z
            .array(
                z.object({
                    target: z.object({
                        method: z.enum([
                            'GET',
                            'POST',
                            'PUT',
                            'PATCH',
                            'DELETE',
                            'HEAD',
                            'OPTIONS',
                        ]),
                        url: z.string(),
                        headers: z.record(z.string(), z.string()).optional(),
                        body: z.string().optional(),
                    }),
                    extract: z.array(z.object({ name: z.string(), path: z.string() })).optional(),
                }),
            )
            .min(1)
            .max(50),
    }),
});

const scenarios = new Map<string, ScenarioResponseDto>();

export function resetMockScenarios(seed: ScenarioResponseDto[] = [taskLifecycleScenario]) {
    scenarios.clear();
    for (const scenario of seed) {
        scenarios.set(scenario.id, scenario);
    }
}

resetMockScenarios();

const summary = ({ config: _config, ...rest }: ScenarioResponseDto) => rest;
const notFound = () => coreError(404, 'SCENARIO.NOT_FOUND', 'Scenario not found');
const invalid = () => coreError(400, 'VALIDATION.FAILED', 'The scenario is invalid');

export const scenarioHandlers = [
    http.get('*/v1/scenarios', () => HttpResponse.json([...scenarios.values()].map(summary))),
    http.get('*/v1/scenarios/:id', ({ params }) => {
        const scenario = scenarios.get(String(params.id));
        return scenario ? HttpResponse.json(scenario) : notFound();
    }),
    http.post('*/v1/scenarios', async ({ request }) => {
        const parsed = bodySchema.safeParse(await request.json());
        if (!parsed.success) {
            return invalid();
        }
        const now = new Date().toISOString();
        const scenario: ScenarioResponseDto = {
            id: crypto.randomUUID(),
            ...parsed.data,
            stepsCount: parsed.data.config.steps.length,
            createdAt: now,
            updatedAt: now,
        };
        scenarios.set(scenario.id, scenario);
        return HttpResponse.json(scenario, { status: 201 });
    }),
    http.put('*/v1/scenarios/:id', async ({ params, request }) => {
        const existing = scenarios.get(String(params.id));
        if (!existing) {
            return notFound();
        }
        const parsed = bodySchema.safeParse(await request.json());
        if (!parsed.success) {
            return invalid();
        }
        const scenario: ScenarioResponseDto = {
            ...existing,
            ...parsed.data,
            stepsCount: parsed.data.config.steps.length,
            updatedAt: new Date().toISOString(),
        };
        scenarios.set(scenario.id, scenario);
        return HttpResponse.json(scenario);
    }),
    http.delete('*/v1/scenarios/:id', ({ params }) => {
        if (!scenarios.delete(String(params.id))) {
            return notFound();
        }
        return new HttpResponse(null, { status: 204 });
    }),
];
