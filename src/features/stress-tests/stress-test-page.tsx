import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useTestRunsGet } from '@/api/generated/endpoints/test-runs/test-runs';
import { snapshotLatency } from '@/api/live';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs } from '@/components/ui/tabs';
import { config } from '@/config';
import { type ApiSpec, type Endpoint, isUsableServer } from '@/features/collections';
import { RecentRunsCard } from '@/features/history';
import {
    LiveCharts,
    LiveStats,
    RunFailure,
    RunProgress,
    StatusCodesCard,
} from '@/features/live-metrics';
import {
    buildRequest,
    emptyDraft,
    pathParamNames,
    type RequestDraft,
    type RequestRoute,
} from '@/lib/request-draft';

import { ActiveRunBanner } from './active-run-banner';
import { exampleBody, rememberBody, restoredDraft } from './endpoint-draft';
import { EndpointHeader } from './endpoint-header';
import { NoEndpoint } from './no-endpoint';
import { type PastRequest, pastRequest } from './past-run';
import { RequestCard } from './request-card';
import { TestConfigBar } from './test-config-bar';
import { useRunLimits } from './use-run-limits';
import { useRunOutcome } from './use-run-outcome';
import { useServer } from './use-server';
import { useTestRunControls } from './use-test-run-controls';

const modes = [
    {
        value: 'single',
        labelKey: 'stressTests.modes.single',
        hintKey: 'stressTests.modeHints.single',
        enabled: true,
    },
    {
        value: 'batch',
        labelKey: 'stressTests.modes.batch',
        hintKey: 'stressTests.modeHints.batch',
        enabled: config.features.batch,
    },
    {
        value: 'roundRobin',
        labelKey: 'stressTests.modes.roundRobin',
        hintKey: 'stressTests.modeHints.roundRobin',
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
    pending?: boolean;
    runId: string | undefined;
    onRunStarted: (runId: string) => void;
}

const joinUrl = (base: string, path: string) => `${base.replace(/\/+$/, '')}${path}`;

type Mode = (typeof modes)[number]['value'];

interface WorkspaceProps extends StressTestPageProps {
    past: PastRequest | null;
}

function Workspace({
    selection,
    past,
    missing = false,
    pending = false,
    runId,
    onRunStarted,
}: WorkspaceProps) {
    const { t } = useTranslation();
    const [mode, setMode] = useState<Mode>('single');
    const modeHint =
        modes.find((candidate) => candidate.value === mode)?.hintKey ?? modes[0].hintKey;
    const place = selection ? { spec: selection.spec.id, endpoint: selection.endpoint.key } : null;
    const [draft, setDraft] = useState<RequestDraft>(() => {
        if (selection && place) {
            return restoredDraft(selection.endpoint, place);
        }
        return past ? past.draft : emptyDraft();
    });
    const changeDraft = (next: RequestDraft) => {
        if (selection && place && next.body !== draft.body) {
            rememberBody(selection.endpoint, place, next.body);
        }
        setDraft(next);
    };
    const [pastServer, setPastServer] = useState(past?.server ?? '');
    const specServers = selection?.spec.servers ?? [];
    const servers = specServers.filter(isUsableServer);
    const relativeServer = specServers.find((candidate) => !isUsableServer(candidate));
    const [server, setServer] = useServer(selection?.spec.id ?? '', servers);
    const endpoint = selection?.endpoint;
    const example = endpoint ? exampleBody(endpoint) : undefined;
    let route: RequestRoute | null = null;
    if (endpoint) {
        route = { method: endpoint.method, url: joinUrl(server, endpoint.path) };
    } else if (past) {
        route = { method: past.method, url: joinUrl(pastServer, past.path) };
    }
    const controls = useTestRunControls({
        target: route ? buildRequest(route, draft) : null,
        body: draft.body,
        runId,
        onRunStarted,
        initialConfig: past?.config,
    });
    const { live } = controls;
    const outcome = useRunOutcome(runId, live);
    const { summary } = outcome;
    const totals = summary?.totals ?? live.totals;
    const limits = useRunLimits(runId) ?? controls.config;
    const locked = controls.phase !== 'idle';
    const progress = runId ? (
        <RunProgress
            status={live.status}
            elapsedSeconds={live.latest?.elapsedSeconds ?? summary?.durationSeconds ?? 0}
            durationSeconds={limits.durationSeconds}
        />
    ) : null;
    let chartsEmpty = t('stressTests.resultsLater');
    if (outcome.failure) {
        chartsEmpty = t('stressTests.failedNoData');
    } else if (live.isFinal) {
        chartsEmpty = t('stressTests.finishedNoData');
    }

    return (
        <Tabs.Root
            value={mode}
            onValueChange={(next) => {
                const found = modes.find((candidate) => candidate.value === next);
                if (found) {
                    setMode(found.value);
                }
            }}
        >
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Tabs.List aria-label={t('stressTests.title')}>
                        {modes
                            .filter((candidate) => candidate.enabled)
                            .map((candidate) => (
                                <Tabs.Tab
                                    key={candidate.value}
                                    value={candidate.value}
                                    className="group flex items-center gap-1.75"
                                >
                                    <span
                                        aria-hidden
                                        className="bg-fg-disabled group-aria-selected:bg-accent size-1.5 rounded-full"
                                    />
                                    {t(candidate.labelKey)}
                                </Tabs.Tab>
                            ))}
                    </Tabs.List>
                    <p className="text-fg-muted text-sm">{t(modeHint)}</p>
                </div>
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
                {endpoint ? (
                    <EndpointHeader
                        method={endpoint.method}
                        path={endpoint.path}
                        summary={endpoint.summary}
                        deprecated={endpoint.deprecated}
                        serverPlaceholder={servers[0]?.url}
                        relativeServer={relativeServer?.url}
                        server={server}
                        onServerChange={setServer}
                        serverLocked={locked}
                        status={progress}
                    />
                ) : past ? (
                    <EndpointHeader
                        method={past.method}
                        path={past.path}
                        server={pastServer}
                        onServerChange={setPastServer}
                        serverLocked={locked}
                        status={progress}
                    />
                ) : null}
                {missing && !past ? (
                    <Card>
                        <EmptyState
                            size="compact"
                            title={t('stressTests.notFound.title')}
                            description={t('stressTests.notFound.body')}
                        />
                    </Card>
                ) : pending ? (
                    <Skeleton className="h-120" />
                ) : route ? (
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
                            targetRps={summary?.targetRps ?? limits.targetRps}
                            scope={summary ? 'run' : 'second'}
                        />
                        {outcome.failure ? <RunFailure reason={outcome.failure} /> : null}
                        <div className="grid grid-cols-2 items-start gap-3">
                            <div className="flex min-w-0 flex-col gap-3">
                                <RequestCard
                                    draft={draft}
                                    onDraftChange={changeDraft}
                                    readOnly={locked}
                                    pathParams={route ? pathParamNames(route.url) : []}
                                    onFillExample={
                                        example === undefined
                                            ? undefined
                                            : () => changeDraft({ ...draft, body: example })
                                    }
                                    className="h-120"
                                />
                                <RecentRunsCard />
                            </div>
                            <div className="flex min-w-0 flex-col gap-3">
                                <LiveCharts
                                    snapshots={live.snapshots}
                                    durationSeconds={limits.durationSeconds}
                                    emptyMessage={chartsEmpty}
                                />
                                <StatusCodesCard
                                    codes={totals.codes}
                                    networkErrors={totals.networkErrors}
                                />
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        <NoEndpoint />
                        <RecentRunsCard />
                    </>
                )}
            </Tabs.Panel>
        </Tabs.Root>
    );
}

export function StressTestPage(props: StressTestPageProps) {
    const { t } = useTranslation();
    const { selection, runId, onRunStarted } = props;
    const [ownRuns, setOwnRuns] = useState<ReadonlySet<string>>(() => new Set());
    const [seedId, setSeedId] = useState(runId);
    let nextSeed = runId;
    if (runId && ownRuns.has(runId)) {
        nextSeed = seedId;
    }
    if (nextSeed !== seedId) {
        setSeedId(nextSeed);
    }
    const seed = useTestRunsGet(seedId ?? '', {
        query: {
            enabled: !selection && Boolean(seedId),
            staleTime: Number.POSITIVE_INFINITY,
            retry: false,
        },
    });
    const past = !selection && seed.data && seed.data.id === seedId ? pastRequest(seed.data) : null;
    const pending = props.pending === true || (!selection && Boolean(seedId) && seed.isPending);
    let key = 'none';
    if (selection) {
        key = `${selection.spec.id}:${selection.endpoint.key}`;
    } else if (past && seedId) {
        key = `run:${seedId}`;
    }
    return (
        <>
            <PageHeader
                title={t('stressTests.title')}
                visuallyHidden
            />
            <Workspace
                key={key}
                {...props}
                past={past}
                pending={pending}
                onRunStarted={(id) => {
                    setOwnRuns((current) => new Set(current).add(id));
                    onRunStarted(id);
                }}
            />
        </>
    );
}
