import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { toast } from '@/components/ui/toast';
import { formatRelativeTime } from '@/lib/format';
import { onStepPicked, type StepSeed } from '@/lib/step-seed';

import { DeleteScenarioDialog } from './components/delete-scenario-dialog';
import { RunPanel } from './components/run-panel';
import { ScenarioHeader } from './components/scenario-header';
import { StepsPanel } from './components/steps-panel';
import { VariablesCard } from './components/variables-card';
import { type Scenario, type ScenarioSummary, useSaveScenario } from './scenario-api';
import { checkScenario, extractedNames, issueCount } from './scenario-checks';
import {
    draftFromScenario,
    hasContent,
    sameScenario,
    savedStepId,
    type ScenarioDraft,
    stepFromSeed,
    toConfig,
} from './scenario-draft';
import {
    dropDraft,
    forgetScenario,
    moveScenarioMemory,
    NEW_SCENARIO,
    saveDraft,
    setRunOutcome,
    useScenarioStore,
} from './scenario-store';
import { useScenarioRun } from './use-scenario-run';
import { sendBlockFor, useStepSends, valuesBeforeEach } from './use-step-sends';

const EMPTY_DRAFT: ScenarioDraft = { name: '', steps: [] };

export interface ScenarioWorkspaceProps {
    scenarioKey: string;
    saved: Scenario | null;
    summary: ScenarioSummary | null;
    tabs: ReactNode;
    onOpen: (key?: string) => void;
}

function knownBeforeEach(draft: ScenarioDraft): Set<string>[] {
    const known = new Set<string>();
    return draft.steps.map((step) => {
        const before = new Set(known);
        for (const name of extractedNames(step)) {
            known.add(name);
        }
        return before;
    });
}

export function ScenarioWorkspace({
    scenarioKey,
    saved,
    summary,
    tabs,
    onOpen,
}: ScenarioWorkspaceProps) {
    const { t, i18n } = useTranslation();
    const store = useScenarioStore();
    const base = useMemo(() => (saved ? draftFromScenario(saved) : EMPTY_DRAFT), [saved]);
    const stored = store.drafts[scenarioKey];
    const draft = stored ?? base;
    const dirty = stored !== undefined;
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [nameInvalid, setNameInvalid] = useState(false);
    const [announcement, setAnnouncement] = useState('');
    const [deleting, setDeleting] = useState(false);
    const nameRef = useRef<HTMLInputElement>(null);

    const checks = useMemo(() => checkScenario(draft), [draft]);
    const knownBefore = useMemo(() => knownBeforeEach(draft), [draft]);
    const config = useMemo(() => toConfig(draft), [draft]);
    const run = useScenarioRun(scenarioKey, config);
    const stepSends = useStepSends();
    const valuesBefore = useMemo(
        () => valuesBeforeEach(draft.steps, stepSends.sends),
        [draft.steps, stepSends.sends],
    );
    const sendBlocks = draft.steps.map((_, index) =>
        sendBlockFor(draft.steps, index, checks.steps[index] ?? [], valuesBefore[index] ?? {}),
    );
    const takenNames = useMemo(
        () => new Set(draft.steps.flatMap((step) => extractedNames(step))),
        [draft.steps],
    );

    const setDraft = (next: ScenarioDraft) => {
        const unchanged = saved ? sameScenario(next, saved) : !hasContent(next);
        if (unchanged) {
            dropDraft(scenarioKey);
        } else {
            saveDraft(scenarioKey, next);
        }
    };

    const addStep = (seed?: StepSeed) => {
        const step = stepFromSeed(seed);
        setDraft({ ...draft, steps: [...draft.steps, step] });
        setExpandedId(seed ? expandedId : step.id);
        setAnnouncement(
            t('scenarios.steps.added', {
                number: draft.steps.length + 1,
                method: step.method,
                url: step.url || t('scenarios.step.noUrl'),
            }),
        );
    };

    const addStepRef = useRef(addStep);
    useEffect(() => {
        addStepRef.current = addStep;
    });
    useEffect(() => onStepPicked((seed) => addStepRef.current(seed)), []);

    const { runId, result } = run;
    useEffect(() => {
        if (runId && result) {
            const passed = result.summary.okCount === result.summary.totalSteps;
            setRunOutcome(scenarioKey, runId, passed ? 'passed' : 'failed');
        }
    }, [scenarioKey, runId, result]);

    const save = useSaveScenario((scenario, created) => {
        setNameInvalid(false);
        const expandedIndex = draft.steps.findIndex((step) => step.id === expandedId);
        setExpandedId(expandedIndex === -1 ? null : savedStepId(scenario.id, expandedIndex));
        stepSends.rename(
            new Map(draft.steps.map((step, index) => [step.id, savedStepId(scenario.id, index)])),
        );
        toast.success({ title: t('scenarios.saved', { name: scenario.name }) });
        if (created) {
            moveScenarioMemory(NEW_SCENARIO, scenario.id);
            onOpen(scenario.id);
        } else {
            dropDraft(scenarioKey);
        }
    });

    const results =
        run.result && !run.stale && run.result.steps.length === draft.steps.length
            ? run.result.steps
            : [];
    const problems = issueCount(checks);
    let blockedReason: string | null = null;
    if (draft.steps.length === 0) {
        blockedReason = t('scenarios.blocked.noSteps');
    } else if (problems > 0) {
        blockedReason = t('scenarios.blocked.problems', { count: problems });
    }

    return (
        <>
            {tabs}
            <ScenarioHeader
                name={draft.name}
                onNameChange={(name) => {
                    setNameInvalid(false);
                    setDraft({ ...draft, name });
                }}
                nameRef={nameRef}
                nameInvalid={nameInvalid}
                stepCount={draft.steps.length}
                variableCount={checks.variables.length}
                meta={
                    summary && !dirty ? (
                        <span className="text-fg-muted text-label">
                            {t('scenarios.header.edited', {
                                time: formatRelativeTime(summary.updatedAt, i18n.language),
                            })}
                        </span>
                    ) : null
                }
                dirty={dirty}
                saved={saved !== null}
                saving={save.isPending}
                saveBlocked={draft.steps.length === 0 || problems > 0}
                phase={run.phase}
                blockedReason={blockedReason}
                onSave={() => {
                    if (draft.name.trim() === '') {
                        setNameInvalid(true);
                        nameRef.current?.focus();
                        toast.error({ title: t('scenarios.blocked.noName') });
                        return;
                    }
                    save.mutate({ id: saved?.id ?? null, draft });
                }}
                onRun={run.start}
                onStop={run.stop}
                onDiscard={() => {
                    dropDraft(scenarioKey);
                    setExpandedId(null);
                }}
                onDelete={() => setDeleting(true)}
            />
            <div className="flex min-h-0 items-start gap-3">
                <StepsPanel
                    steps={draft.steps}
                    issues={checks.steps}
                    knownBefore={knownBefore}
                    results={results}
                    sends={stepSends.sends}
                    sendBlocks={sendBlocks}
                    takenNames={takenNames}
                    onSend={(index) => {
                        const step = draft.steps[index];
                        if (step && !sendBlocks[index]) {
                            stepSends.send(step, valuesBefore[index] ?? {});
                        }
                    }}
                    expandedId={expandedId}
                    onExpandedChange={setExpandedId}
                    onStepsChange={(steps) => setDraft({ ...draft, steps })}
                    onAdd={addStep}
                />
                <aside
                    aria-label={t('scenarios.sideLabel')}
                    className="flex w-84 shrink-0 flex-col gap-3"
                >
                    <RunPanel
                        phase={run.phase}
                        hasRun={run.runId !== undefined}
                        status={run.status}
                        reason={run.reason}
                        result={run.result}
                        loadingResult={run.loadingResult}
                        stale={run.stale}
                        finishedAt={run.finishedAt}
                    />
                    <VariablesCard
                        variables={checks.variables}
                        undefinedNames={checks.undefinedVariables}
                    />
                </aside>
            </div>
            <output
                aria-live="polite"
                className="sr-only"
            >
                {announcement}
            </output>
            {summary ? (
                <DeleteScenarioDialog
                    scenario={summary}
                    open={deleting}
                    onOpenChange={setDeleting}
                    onDeleted={(deleted) => {
                        forgetScenario(deleted.id);
                        toast.success({ title: t('scenarios.deleted', { name: deleted.name }) });
                        onOpen();
                    }}
                />
            ) : null}
        </>
    );
}
