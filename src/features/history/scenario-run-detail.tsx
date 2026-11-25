import { useQueries } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { Download, RotateCcw, Workflow } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { getTestRunsGetQueryOptions } from '@/api/generated/endpoints/test-runs/test-runs';
import type { TestRunResponseDto } from '@/api/generated/model';
import { StatCard, StatList } from '@/components/shared/stat-card';
import { StepTimeline, type StepTimelineStep } from '@/components/shared/step-timeline';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { RunFailure } from '@/features/live-metrics';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';

import type { RunListItem } from './history-api';
import { formatRunDateTime, runHost, runPath, shortRunId } from './history-format';
import { StopRunButton } from './run-in-progress';
import { STATUS_TEXT } from './run-status';
import {
    firstStepWith,
    sameScenarioRuns,
    type ScenarioConfig,
    scenarioCandidates,
    scenarioResultOf,
    scenarioVariables,
    stepNumber,
    timelineSteps,
} from './scenario-run';
import { FailedStepCard, ScenarioRunsCard, VariablesCard } from './scenario-run-cards';
import { downloadRun, useRerun } from './use-rerun';

const SCENARIO_RUNS = 5;

const STEP_STATUS = { OK: 'ok', FAILED: 'failed', SKIPPED: 'skipped' } as const;

const PREV_BADGE = 'bg-surface-2 text-fg-muted rounded-sm px-1.5 py-0.5 font-mono text-xs';

export interface ScenarioRunDetailProps {
    run: TestRunResponseDto;
    config: ScenarioConfig;
    listItems: readonly RunListItem[];
    className?: string;
}

export function ScenarioRunDetail({ run, config, listItems, className }: ScenarioRunDetailProps) {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const format = (value: number) => formatNumber(value, 0, i18n.language);
    const ms = (value: number) => t('history.ms', { value: format(value) });

    const origin = run.scenario;
    const name = origin?.name || t('history.scenario.untitled');
    const candidates = scenarioCandidates(listItems, run.id, config.steps.length);
    const candidateRuns = useQueries({
        queries: candidates.map((item) => getTestRunsGetQueryOptions(item.id)),
    });
    const scenarioRuns = sameScenarioRuns(
        run,
        candidateRuns.map((query) => query.data),
        SCENARIO_RUNS,
    );
    const previous = scenarioResultOf(scenarioRuns[1]);

    const rerun = useRerun((created) => {
        void navigate({ to: '/history', search: (prev) => ({ ...prev, run: created.id }) });
    });

    const result = scenarioResultOf(run);
    const variables = scenarioVariables(config);
    const failedIndex = result ? firstStepWith(result, 'FAILED') : null;
    const skippedIndex = result ? firstStepWith(result, 'SKIPPED') : null;
    const problemIndex = failedIndex ?? skippedIndex;
    const problemStep = problemIndex === null ? undefined : result?.steps[problemIndex];
    const active = run.status === 'PENDING' || run.status === 'RUNNING';
    const firstUrl = config.steps[0]?.target.url ?? '';

    const steps: StepTimelineStep[] = result
        ? timelineSteps(result).map((step) => ({
              key: String(step.index),
              number: stepNumber(step.index),
              method: step.method,
              path: runPath(step.url),
              status: STEP_STATUS[step.status],
              outcome:
                  step.status === 'SKIPPED'
                      ? t('history.scenario.timeline.skipped')
                      : step.statusCode === undefined
                        ? t('history.scenario.timeline.noResponse')
                        : String(step.statusCode),
              startMs: step.startMs,
              ...(step.durationMs === undefined ? {} : { durationMs: step.durationMs }),
          }))
        : [];

    const sideCards = (
        <>
            <VariablesCard variables={variables} />
            <ScenarioRunsCard
                name={name}
                runs={scenarioRuns}
                currentId={run.id}
            />
        </>
    );

    return (
        <article
            aria-labelledby="run-detail-title"
            className={cn('flex flex-col gap-3', className)}
        >
            <header className="flex items-start gap-4">
                <span className="bg-scenario/14 text-scenario flex size-12 shrink-0 items-center justify-center rounded-lg">
                    <Workflow
                        aria-hidden
                        className="size-5"
                    />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <h2
                            id="run-detail-title"
                            className="text-fg truncate font-mono text-xl font-bold"
                        >
                            {name}
                        </h2>
                        <Badge variant="scenario">{t('history.types.scenario')}</Badge>
                        <Badge
                            variant="outline"
                            className={cn('font-sans font-semibold', STATUS_TEXT[run.status])}
                        >
                            {t(`runStatus.${run.status}`)}
                        </Badge>
                    </div>
                    <p className="text-fg-muted font-mono text-sm">
                        {[
                            runHost(firstUrl),
                            t('history.scenario.steps', { count: config.steps.length }),
                            formatRunDateTime(run.createdAt, i18n.language),
                            t('history.runId', { id: shortRunId(run.id) }),
                        ]
                            .filter(Boolean)
                            .join(' · ')}
                    </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                    <Button
                        variant="secondary"
                        onClick={() => downloadRun(run)}
                    >
                        <Download
                            aria-hidden
                            className="size-3.5"
                        />
                        {t('history.export')}
                    </Button>
                    {origin ? (
                        <Link
                            to="/scenarios"
                            search={{ scenario: origin.id }}
                            className={cn(
                                buttonVariants({ variant: 'secondary' }),
                                'focus-visible:ring-accent/40 outline-none focus-visible:ring-2',
                            )}
                        >
                            {t('history.scenario.openInBuilder')}
                        </Link>
                    ) : null}
                    {active ? (
                        <StopRunButton runId={run.id} />
                    ) : (
                        <Button
                            variant="primary"
                            disabled={rerun.isPending}
                            onClick={() => rerun.mutate(run.id)}
                        >
                            <RotateCcw
                                aria-hidden
                                className="size-3.5"
                            />
                            {rerun.isPending ? t('history.rerunning') : t('history.scenario.rerun')}
                        </Button>
                    )}
                </div>
            </header>

            {run.status === 'FAILED' ? (
                <RunFailure reason={run.reason ?? t('runOutcome.noReason')} />
            ) : null}

            {result ? (
                <StatList className="grid-cols-5">
                    <StatCard
                        label={t('history.scenario.stats.passed')}
                        value={`${result.summary.okCount}/${result.summary.totalSteps}`}
                        badge={
                            previous ? (
                                <span className={PREV_BADGE}>
                                    {t('history.scenario.stats.prev', {
                                        value: `${previous.summary.okCount}/${previous.summary.totalSteps}`,
                                    })}
                                </span>
                            ) : null
                        }
                    />
                    <StatCard
                        label={t('history.scenario.stats.failed')}
                        value={format(result.summary.failedCount)}
                        tone={result.summary.failedCount > 0 ? 'danger' : 'default'}
                        badge={
                            <span className={PREV_BADGE}>
                                {failedIndex === null
                                    ? t('history.scenario.stats.noFailures')
                                    : t('history.scenario.stats.step', {
                                          number: stepNumber(failedIndex),
                                      })}
                            </span>
                        }
                    />
                    <StatCard
                        label={t('history.scenario.stats.skipped')}
                        value={format(result.summary.skippedCount)}
                        badge={
                            <span className={PREV_BADGE}>
                                {skippedIndex === null
                                    ? t('history.scenario.stats.noSkipped')
                                    : t('history.scenario.stats.step', {
                                          number: stepNumber(skippedIndex),
                                      })}
                            </span>
                        }
                    />
                    <StatCard
                        label={t('history.scenario.stats.totalTime')}
                        value={format(result.summary.durationMs)}
                        unit={t('liveMetrics.units.ms')}
                        badge={
                            previous ? (
                                <span className={PREV_BADGE}>
                                    {t('history.scenario.stats.prev', {
                                        value: ms(previous.summary.durationMs),
                                    })}
                                </span>
                            ) : null
                        }
                    />
                    <StatCard
                        label={t('history.scenario.stats.variables')}
                        value={format(variables.length)}
                        badge={
                            <span className={cn(PREV_BADGE, 'max-w-28 truncate')}>
                                {variables.length > 0
                                    ? variables.map((variable) => variable.name).join(', ')
                                    : t('history.scenario.stats.noVariables')}
                            </span>
                        }
                    />
                </StatList>
            ) : null}

            <Card
                aria-labelledby="scenario-timeline-title"
                aria-busy={active}
                className="flex flex-col gap-3"
            >
                <div>
                    <CardTitle
                        id="scenario-timeline-title"
                        className="text-md font-bold"
                    >
                        {t('history.scenario.timeline.title')}
                    </CardTitle>
                    {result ? (
                        <p className="text-fg-muted text-sm">
                            {t('history.scenario.timeline.subtitle', {
                                total: ms(result.summary.durationMs),
                            })}
                        </p>
                    ) : null}
                </div>
                {result ? (
                    <StepTimeline
                        aria-label={t('history.scenario.timeline.label')}
                        steps={steps}
                        formatTick={(value, last) => (last ? ms(value) : format(value))}
                        formatDuration={ms}
                    />
                ) : (
                    <p className="text-fg-muted text-base">
                        {active ? t('history.scenario.running') : t('history.scenario.noResult')}
                    </p>
                )}
            </Card>

            {problemStep && problemIndex !== null ? (
                <div className="grid grid-cols-2 items-start gap-3">
                    <FailedStepCard
                        index={problemIndex}
                        step={problemStep}
                        body={config.steps[problemIndex]?.target.body}
                    />
                    <div className="flex flex-col gap-3">{sideCards}</div>
                </div>
            ) : (
                <div className="grid grid-cols-2 items-start gap-3">{sideCards}</div>
            )}
        </article>
    );
}
