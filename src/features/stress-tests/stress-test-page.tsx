import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { snapshotLatency } from '@/api/live';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { Card } from '@/components/ui/card';
import { Tabs } from '@/components/ui/tabs';
import { config } from '@/config';
import { type ApiSpec, type Endpoint, isUsableServer } from '@/features/collections';
import {
    LiveCharts,
    LiveStats,
    RunFailure,
    RunProgress,
    StatusCodesCard,
} from '@/features/live-metrics';
import { buildRequest, emptyDraft, pathParamNames, type RequestDraft } from '@/lib/request-draft';

import { ActiveRunBanner } from './active-run-banner';
import { draftFromEndpoint, hasBodyFields, placeholderBody } from './endpoint-draft';
import { EndpointHeader } from './endpoint-header';
import { RequestCard } from './request-card';
import { TestConfigBar } from './test-config-bar';
import { useRunOutcome } from './use-run-outcome';
import { useServer } from './use-server';
import { useTestRunControls } from './use-test-run-controls';

const modes = [
    { value: 'single', labelKey: 'stressTests.modes.single', enabled: true },
    { value: 'batch', labelKey: 'stressTests.modes.batch', enabled: config.features.batch },
    {
        value: 'roundRobin',
        labelKey: 'stressTests.modes.roundRobin',
        enabled: config.features.roundRobin,
    },
] as const;

export interface EndpointSelection {
    spec: ApiSpec;
    endpoint: Endpoint;
}

export interface StressTestPageProps {
    selection: EndpointSelection | null;
    missing?: boolean;
    runId: string | undefined;
    onRunStarted: (runId: string) => void;
}

const joinUrl = (base: string, path: string) => `${base.replace(/\/+$/, '')}${path}`;

function Workspace({ selection, missing = false, runId, onRunStarted }: StressTestPageProps) {
    const { t } = useTranslation();
    const [draft, setDraft] = useState<RequestDraft>(() =>
        selection ? draftFromEndpoint(selection.endpoint) : emptyDraft(),
    );
    const specServers = selection?.spec.servers ?? [];
    const servers = specServers.filter(isUsableServer);
    const relativeServer = specServers.find((candidate) => !isUsableServer(candidate));
    const [server, setServer] = useServer(selection?.spec.id ?? '', servers);
    const endpoint = selection?.endpoint;
    const route = endpoint
        ? { method: endpoint.method, url: joinUrl(server, endpoint.path) }
        : null;
    const controls = useTestRunControls({
        target: route ? buildRequest(route, draft) : null,
        body: draft.body,
        runId,
        onRunStarted,
    });
    const { live } = controls;
    const outcome = useRunOutcome(runId, live);
    const { summary } = outcome;
    const totals = summary?.totals ?? live.totals;
    let chartsEmpty = selection ? t('stressTests.resultsLater') : t('stressTests.pickRoute');
    if (outcome.failure) {
        chartsEmpty = t('stressTests.failedNoData');
    } else if (live.isFinal) {
        chartsEmpty = t('stressTests.finishedNoData');
    }

    return (
        <Tabs.Root defaultValue="single">
            <div className="flex items-start justify-between gap-4">
                <Tabs.List aria-label={t('stressTests.title')}>
                    {modes
                        .filter((mode) => mode.enabled)
                        .map((mode) => (
                            <Tabs.Tab
                                key={mode.value}
                                value={mode.value}
                            >
                                {t(mode.labelKey)}
                            </Tabs.Tab>
                        ))}
                </Tabs.List>
                <TestConfigBar
                    config={controls.config}
                    onConfigChange={controls.setConfig}
                    issues={controls.issues}
                    block={controls.block}
                    phase={controls.phase}
                    onStart={controls.start}
                    onStop={controls.stop}
                />
            </div>
            <Tabs.Panel
                value="single"
                className="flex flex-col gap-3 pt-4"
            >
                <ActiveRunBanner currentRunId={runId} />
                {selection && endpoint ? (
                    <EndpointHeader
                        method={endpoint.method}
                        path={endpoint.path}
                        summary={endpoint.summary}
                        deprecated={endpoint.deprecated}
                        collection={selection.spec.name}
                        servers={servers}
                        relativeServer={relativeServer?.url}
                        server={server}
                        onServerChange={setServer}
                        status={
                            runId ? (
                                <RunProgress
                                    status={live.status}
                                    elapsedSeconds={
                                        live.latest?.elapsedSeconds ?? summary?.durationSeconds ?? 0
                                    }
                                    durationSeconds={controls.config.durationSeconds}
                                />
                            ) : null
                        }
                    />
                ) : null}
                {missing ? (
                    <Card>
                        <EmptyState
                            size="compact"
                            title={t('stressTests.notFound.title')}
                            description={t('stressTests.notFound.body')}
                        />
                    </Card>
                ) : (
                    <>
                        <LiveStats
                            rps={summary?.avgRps ?? live.latest?.actualRps ?? null}
                            latency={
                                summary
                                    ? summary.latency
                                    : live.latest
                                      ? snapshotLatency(live.latest)
                                      : null
                            }
                            totals={totals}
                            targetRps={summary?.targetRps ?? controls.config.targetRps}
                            scope={summary ? 'run' : 'second'}
                        />
                        {outcome.failure ? <RunFailure reason={outcome.failure} /> : null}
                        <div className="grid grid-cols-2 items-stretch gap-3">
                            <RequestCard
                                draft={draft}
                                onDraftChange={setDraft}
                                pathParams={route ? pathParamNames(route.url) : []}
                                onFillPlaceholders={
                                    endpoint && hasBodyFields(endpoint)
                                        ? () =>
                                              setDraft({
                                                  ...draft,
                                                  body: placeholderBody(
                                                      endpoint.requestBody?.fields ?? [],
                                                  ),
                                              })
                                        : undefined
                                }
                                className="h-0 min-h-[max(100%,26rem)]"
                            />
                            <div className="flex min-w-0 flex-col gap-3">
                                <LiveCharts
                                    snapshots={live.snapshots}
                                    durationSeconds={controls.config.durationSeconds}
                                    emptyMessage={chartsEmpty}
                                />
                                <StatusCodesCard
                                    codes={totals.codes}
                                    networkErrors={totals.networkErrors}
                                />
                            </div>
                        </div>
                    </>
                )}
            </Tabs.Panel>
        </Tabs.Root>
    );
}

export function StressTestPage(props: StressTestPageProps) {
    const { t } = useTranslation();
    const key = props.selection
        ? `${props.selection.spec.id}:${props.selection.endpoint.key}`
        : 'none';
    return (
        <>
            <PageHeader
                title={t('stressTests.title')}
                visuallyHidden
            />
            <Workspace
                key={key}
                {...props}
            />
        </>
    );
}
