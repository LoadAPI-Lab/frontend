import { useEffect, useMemo, useRef, useState } from 'react';

import { requestsSend } from '@/api/generated/endpoints/requests/requests';
import type { SendRequestDto, SendRequestResponseDto } from '@/api/generated/model';
import { type SendProblem, sendProblem } from '@/lib/send-problem';

import { capturedValues, substituteVariables } from './response-values';
import type { StepIssue } from './scenario-checks';
import { usedVariables } from './scenario-checks';
import { sendsBody, type StepDraft } from './scenario-draft';

export interface StepSend {
    sending: boolean;
    outcome: SendRequestResponseDto | null;
    problem: SendProblem | null;
}

export type SendBlock =
    | { kind: 'issues' }
    | { kind: 'needsValues'; names: string[]; fromStep: number | null };

const SEND_BLOCKING: ReadonlySet<StepIssue['kind']> = new Set([
    'noUrl',
    'pathParam',
    'undefinedVariable',
    'unknownGenerator',
    'invalidBody',
]);

export function stepRequest(
    step: StepDraft,
    values: Readonly<Record<string, string>>,
): SendRequestDto {
    const fill = (text: string) => substituteVariables(text, values);
    const headers = Object.fromEntries(
        step.headers
            .filter((row) => row.key.trim() !== '')
            .map((row) => [row.key.trim(), fill(row.value)]),
    );
    const body = sendsBody(step.method) && step.body.trim() !== '' ? fill(step.body) : undefined;
    return {
        method: step.method,
        url: fill(step.url.trim()),
        ...(Object.keys(headers).length > 0 ? { headers } : {}),
        ...(body === undefined ? {} : { body }),
    };
}

export function valuesBeforeEach(
    steps: readonly StepDraft[],
    sends: Readonly<Record<string, StepSend>>,
): Record<string, string>[] {
    let values: Record<string, string> = {};
    return steps.map((step) => {
        const before = values;
        const outcome = sends[step.id]?.outcome;
        if (outcome?.kind === 'response') {
            values = { ...values, ...capturedValues(step.extract, outcome.body) };
        }
        return before;
    });
}

export function sendBlockFor(
    steps: readonly StepDraft[],
    index: number,
    issues: readonly StepIssue[],
    values: Readonly<Record<string, string>>,
): SendBlock | null {
    const step = steps[index];
    if (!step || issues.some((issue) => SEND_BLOCKING.has(issue.kind))) {
        return { kind: 'issues' };
    }
    const names = usedVariables(step).filter((name) => !(name in values));
    if (names.length === 0) {
        return null;
    }
    const fromStep = steps.findIndex(
        (other, otherIndex) =>
            otherIndex < index && other.extract.some((rule) => names.includes(rule.key.trim())),
    );
    return { kind: 'needsValues', names, fromStep: fromStep === -1 ? null : fromStep + 1 };
}

const IDLE: StepSend = { sending: false, outcome: null, problem: null };

let memory: Record<string, StepSend> = {};

export function resetStepSends() {
    memory = {};
}

export function useStepSends() {
    const [sends, setSends] = useState(memory);
    const controllers = useRef(new Map<string, AbortController>());

    useEffect(() => {
        const active = controllers.current;
        return () => {
            for (const controller of active.values()) {
                controller.abort();
            }
            memory = Object.fromEntries(
                Object.entries(memory).map(([id, value]) => [id, { ...value, sending: false }]),
            );
        };
    }, []);

    return useMemo(() => {
        const commit = (next: Record<string, StepSend>) => {
            memory = next;
            setSends(next);
        };
        const update = (id: string, next: StepSend) => commit({ ...memory, [id]: next });

        return {
            sends,
            send: (step: StepDraft, values: Readonly<Record<string, string>>) => {
                controllers.current.get(step.id)?.abort();
                const controller = new AbortController();
                controllers.current.set(step.id, controller);
                update(step.id, { ...(memory[step.id] ?? IDLE), sending: true, problem: null });
                requestsSend(stepRequest(step, values), { signal: controller.signal })
                    .then((outcome) => update(step.id, { sending: false, outcome, problem: null }))
                    .catch((error: unknown) => {
                        if (controller.signal.aborted) {
                            return;
                        }
                        const problem = sendProblem(
                            error instanceof Error ? error : new Error(String(error)),
                        );
                        update(step.id, { sending: false, outcome: null, problem });
                    })
                    .finally(() => {
                        if (controllers.current.get(step.id) === controller) {
                            controllers.current.delete(step.id);
                        }
                    });
            },
            rename: (ids: ReadonlyMap<string, string>) =>
                commit(
                    Object.fromEntries(
                        Object.entries(memory).map(([id, value]) => [ids.get(id) ?? id, value]),
                    ),
                ),
        };
    }, [sends]);
}
