import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { PlusIcon } from '@/components/ui/icons';
import { cn } from '@/lib/cn';
import { parseStepSeed, STEP_SEED_MIME, type StepSeed } from '@/lib/step-seed';

import { MAX_STEPS, type StepIssue } from '../scenario-checks';
import { duplicateStep, moveStep, type StepDraft } from '../scenario-draft';
import type { StepResult } from '../use-scenario-run';
import type { SendBlock, StepSend } from '../use-step-sends';
import { StepCard } from './step-card';

export interface StepsPanelProps {
    steps: StepDraft[];
    issues: StepIssue[][];
    knownBefore: ReadonlySet<string>[];
    results: (StepResult | undefined)[];
    sends: Readonly<Record<string, StepSend>>;
    sendBlocks: (SendBlock | null)[];
    takenNames: ReadonlySet<string>;
    onSend: (index: number) => void;
    expandedId: string | null;
    onExpandedChange: (id: string | null) => void;
    onStepsChange: (steps: StepDraft[]) => void;
    onAdd: (seed?: StepSeed) => void;
}

export function StepsPanel({
    steps,
    issues,
    knownBefore,
    results,
    sends,
    sendBlocks,
    takenNames,
    onSend,
    expandedId,
    onExpandedChange,
    onStepsChange,
    onAdd,
}: StepsPanelProps) {
    const { t } = useTranslation();
    const [dropping, setDropping] = useState(false);
    const full = steps.length >= MAX_STEPS;
    const accepts = (types: readonly string[]) => !full && types.includes(STEP_SEED_MIME);

    return (
        // oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
        <section
            aria-labelledby="scenario-steps-title"
            className="bg-surface-1 border-border rounded-card flex min-w-0 flex-1 flex-col border p-4"
            onDragOver={(event) => {
                if (accepts(event.dataTransfer.types)) {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = 'copy';
                    setDropping(true);
                }
            }}
            onDragLeave={(event) => {
                const into = event.relatedTarget;
                if (!(into instanceof Node) || !event.currentTarget.contains(into)) {
                    setDropping(false);
                }
            }}
            onDrop={(event) => {
                setDropping(false);
                const seed = parseStepSeed(event.dataTransfer.getData(STEP_SEED_MIME));
                if (seed && !full) {
                    event.preventDefault();
                    onAdd(seed);
                }
            }}
        >
            <div className="mb-3 flex items-baseline justify-between">
                <h2
                    id="scenario-steps-title"
                    className="text-fg-muted tracking-label text-xs font-semibold uppercase"
                >
                    {t('scenarios.steps.title')}
                </h2>
                <span className="text-fg-muted font-mono text-sm tabular-nums">
                    {t('scenarios.steps.limit', { count: steps.length, max: MAX_STEPS })}
                </span>
            </div>
            {steps.length > 0 ? (
                <ol className="flex flex-col">
                    {steps.map((step, index) => (
                        <StepCard
                            key={step.id}
                            step={step}
                            number={index + 1}
                            total={steps.length}
                            issues={issues[index] ?? []}
                            known={knownBefore[index] ?? new Set()}
                            result={results[index]}
                            send={sends[step.id]}
                            sendBlock={sendBlocks[index] ?? null}
                            takenNames={takenNames}
                            onSend={() => onSend(index)}
                            expanded={expandedId === step.id}
                            onExpandedChange={(open) => onExpandedChange(open ? step.id : null)}
                            onChange={(next) =>
                                onStepsChange(
                                    steps.map((other) => (other.id === step.id ? next : other)),
                                )
                            }
                            onMove={(offset) =>
                                onStepsChange(moveStep(steps, index, index + offset))
                            }
                            onDuplicate={() => onStepsChange(duplicateStep(steps, index))}
                            onRemove={() =>
                                onStepsChange(steps.filter((other) => other.id !== step.id))
                            }
                        />
                    ))}
                </ol>
            ) : null}
            <div
                className={cn(
                    'text-fg-muted flex flex-col items-center gap-2 rounded-lg border border-dashed px-4 text-center text-base transition-colors',
                    steps.length === 0 ? 'py-10' : 'ml-10 py-4',
                    dropping
                        ? 'border-accent bg-accent/10 text-fg'
                        : 'border-accent/30 bg-accent/4',
                )}
            >
                {steps.length === 0 ? (
                    <p className="text-fg text-md font-semibold">
                        {t('scenarios.steps.emptyTitle')}
                    </p>
                ) : null}
                <p>
                    {full
                        ? t('scenarios.steps.full', { max: MAX_STEPS })
                        : t('scenarios.steps.dropHint')}
                </p>
                <button
                    type="button"
                    disabled={full}
                    className="text-accent focus-visible:ring-accent/40 inline-flex items-center gap-1.5 rounded-sm font-semibold outline-none hover:underline focus-visible:ring-2 disabled:opacity-50"
                    onClick={() => onAdd()}
                >
                    <PlusIcon aria-hidden />
                    {t('scenarios.steps.addBlank')}
                </button>
            </div>
        </section>
    );
}
