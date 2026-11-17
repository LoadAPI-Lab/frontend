import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import type { TestRunResponseDto } from '@/api/generated/model';
import { Card, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';
import { methodColorClass } from '@/lib/http-method';

import { formatRunDateTime, runPath } from './history-format';
import {
    type ScenarioStepResult,
    type ScenarioStepStatus,
    type ScenarioVariable,
    scenarioResultOf,
    stepNumber,
} from './scenario-run';

function Figure({ label, tone, children }: { label: string; tone?: string; children: ReactNode }) {
    return (
        <div
            className={cn(
                'bg-surface-input border-border-strong flex min-w-0 flex-col gap-1 rounded-lg border px-3 py-2',
                tone,
            )}
        >
            <dt className="text-fg-muted text-sm">{label}</dt>
            <dd className="truncate font-mono text-base font-bold tabular-nums">{children}</dd>
        </div>
    );
}

export interface FailedStepCardProps {
    index: number;
    step: ScenarioStepResult;
    body: string | undefined;
}

export function FailedStepCard({ index, step, body }: FailedStepCardProps) {
    const { t, i18n } = useTranslation();
    const failed = step.status === 'FAILED';
    return (
        <Card
            aria-labelledby="scenario-problem-step"
            className={cn('flex flex-col gap-3', failed && 'border-danger/35')}
        >
            <div className="flex min-w-0 items-center gap-2.5">
                <span
                    className={cn(
                        'flex size-6 shrink-0 items-center justify-center rounded-sm font-mono text-xs font-bold',
                        failed ? 'bg-danger/14 text-danger' : 'bg-surface-2 text-fg-muted',
                    )}
                >
                    {stepNumber(index)}
                </span>
                <CardTitle
                    id="scenario-problem-step"
                    className="text-md shrink-0 font-bold"
                >
                    {failed
                        ? t('history.scenario.failedStep.title')
                        : t('history.scenario.failedStep.skippedTitle')}
                </CardTitle>
                <span className="text-fg-muted text-label min-w-0 truncate font-mono">
                    <span className={cn('font-bold', methodColorClass(step.method))}>
                        {step.method}
                    </span>{' '}
                    {runPath(step.url)}
                </span>
            </div>
            {failed ? (
                <dl className="grid grid-cols-2 gap-2">
                    <Figure
                        label={t('history.scenario.failedStep.received')}
                        tone="border-danger/35 bg-danger/8 text-danger"
                    >
                        {step.statusCode ?? t('history.scenario.failedStep.noResponse')}
                    </Figure>
                    <Figure
                        label={t('history.scenario.failedStep.duration')}
                        tone="text-fg"
                    >
                        {step.durationMs === undefined
                            ? '—'
                            : t('history.ms', {
                                  value: formatNumber(step.durationMs, 0, i18n.language),
                              })}
                    </Figure>
                </dl>
            ) : null}
            {step.description ? (
                <div className="flex flex-col gap-1">
                    <span className="text-fg-muted text-sm">
                        {t('history.scenario.failedStep.reason')}
                    </span>
                    <p
                        className={cn(
                            'bg-surface-code border-track rounded-editor border p-3 font-mono text-sm break-words',
                            failed ? 'text-danger' : 'text-fg-secondary',
                        )}
                    >
                        {step.description}
                    </p>
                </div>
            ) : null}
            {body ? (
                <div className="flex flex-col gap-1">
                    <span className="text-fg-muted text-sm">
                        {t('history.scenario.failedStep.requestBody')}
                    </span>
                    <pre className="bg-surface-code border-track text-fg-secondary rounded-editor max-h-72 overflow-auto border p-3 font-mono text-sm">
                        {body}
                    </pre>
                    <p className="text-fg-muted text-xs">
                        {t('history.scenario.failedStep.requestBodyNote')}
                    </p>
                </div>
            ) : null}
        </Card>
    );
}

const HEAD = 'py-1 text-left text-xs font-semibold uppercase';

export function VariablesCard({ variables }: { variables: readonly ScenarioVariable[] }) {
    const { t } = useTranslation();
    return (
        <Card
            aria-labelledby="scenario-variables"
            className="flex flex-col gap-2"
        >
            <CardTitle
                id="scenario-variables"
                className="text-md font-bold"
            >
                {t('history.scenario.variables.title')}
            </CardTitle>
            {variables.length === 0 ? (
                <p className="text-fg-muted text-base">{t('history.scenario.variables.empty')}</p>
            ) : (
                <table className="text-label w-full table-fixed font-mono tabular-nums">
                    <thead>
                        <tr className="text-fg-muted">
                            <th
                                scope="col"
                                className={HEAD}
                            >
                                {t('history.scenario.variables.name')}
                            </th>
                            <th
                                scope="col"
                                className={cn(HEAD, 'w-2/5')}
                            >
                                {t('history.scenario.variables.path')}
                            </th>
                            <th
                                scope="col"
                                className={cn(HEAD, 'w-14')}
                            >
                                {t('history.scenario.variables.from')}
                            </th>
                            <th
                                scope="col"
                                className={cn(HEAD, 'w-24')}
                            >
                                {t('history.scenario.variables.usedIn')}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {variables.map((variable) => (
                            <tr
                                key={`${variable.from}-${variable.name}`}
                                className="border-border border-t"
                            >
                                <th
                                    scope="row"
                                    className="text-accent truncate py-1.5 text-left font-semibold"
                                >
                                    {variable.name}
                                </th>
                                <td className="text-fg-secondary truncate py-1.5">
                                    {variable.path}
                                </td>
                                <td className="text-fg-muted py-1.5">
                                    {stepNumber(variable.from)}
                                </td>
                                <td className="text-fg-muted py-1.5">
                                    {variable.usedIn.length > 0
                                        ? variable.usedIn.map(stepNumber).join(' ')
                                        : t('history.scenario.variables.unused')}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </Card>
    );
}

const SEGMENT: Record<ScenarioStepStatus, string> = {
    OK: 'bg-accent',
    FAILED: 'bg-danger',
    SKIPPED: 'bg-fg-disabled',
};

export interface ScenarioRunsCardProps {
    name: string;
    runs: readonly TestRunResponseDto[];
    currentId: string;
}

export function ScenarioRunsCard({ name, runs, currentId }: ScenarioRunsCardProps) {
    const { t, i18n } = useTranslation();
    return (
        <Card
            aria-labelledby="scenario-runs"
            className="flex flex-col gap-2"
        >
            <div>
                <CardTitle
                    id="scenario-runs"
                    className="text-md font-bold"
                >
                    {t('history.scenario.runs.title')}
                </CardTitle>
                <p className="text-fg-muted font-mono text-sm">
                    {t('history.scenario.runs.subtitle', { name, count: runs.length })}
                </p>
            </div>
            <ul className="flex flex-col">
                {runs.map((item) => {
                    const result = scenarioResultOf(item);
                    const current = item.id === currentId;
                    const failed = (result?.summary.failedCount ?? 0) > 0;
                    const outcomes = (result?.steps ?? [])
                        .map((step) => t(`history.scenario.outcome.${step.status}`))
                        .join(', ');
                    return (
                        <li
                            key={item.id}
                            aria-current={current ? 'true' : undefined}
                            className={cn(
                                'text-label grid grid-cols-[minmax(0,1fr)_auto_3rem_4rem] items-center gap-3 rounded-lg px-2.5 py-2 font-mono tabular-nums',
                                current && 'bg-accent/8',
                            )}
                        >
                            <span
                                className={cn(
                                    'truncate',
                                    current ? 'text-accent font-semibold' : 'text-fg-secondary',
                                )}
                            >
                                {formatRunDateTime(item.createdAt, i18n.language)}
                                {current ? ` · ${t('history.scenario.runs.this')}` : ''}
                            </span>
                            <span className="flex gap-1">
                                {result ? (
                                    <>
                                        <span className="sr-only">
                                            {t('history.scenario.runs.stepsLabel', { outcomes })}
                                        </span>
                                        {result.steps.map((step, index) => (
                                            <span
                                                // oxlint-disable-next-line react/no-array-index-key
                                                key={index}
                                                aria-hidden
                                                className={cn(
                                                    'h-1.5 w-4 rounded-full',
                                                    SEGMENT[step.status],
                                                )}
                                            />
                                        ))}
                                    </>
                                ) : null}
                            </span>
                            <span
                                className={cn(
                                    'text-right font-bold',
                                    failed ? 'text-danger' : 'text-accent',
                                )}
                            >
                                {result
                                    ? `${result.summary.okCount}/${result.summary.totalSteps}`
                                    : '—'}
                            </span>
                            <span className="text-fg-muted text-right">
                                {result
                                    ? t('history.ms', {
                                          value: formatNumber(
                                              result.summary.durationMs,
                                              0,
                                              i18n.language,
                                          ),
                                      })
                                    : '—'}
                            </span>
                        </li>
                    );
                })}
            </ul>
            <p className="text-fg-muted text-xs">{t('history.scenario.runs.note')}</p>
        </Card>
    );
}
