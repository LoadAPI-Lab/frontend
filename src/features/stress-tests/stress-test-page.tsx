import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { Card } from '@/components/ui/card';
import { Tabs } from '@/components/ui/tabs';
import { config } from '@/config';
import type { ApiSpec, Endpoint } from '@/features/collections';
import { buildRequest, emptyDraft, pathParamNames, type RequestDraft } from '@/lib/request-draft';

import { draftFromEndpoint, hasBodyFields, placeholderBody } from './endpoint-draft';
import { EndpointHeader } from './endpoint-header';
import { RequestCard } from './request-card';
import { TestConfigBar } from './test-config-bar';
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
    const [server, setServer] = useServer(selection?.spec.id ?? '', selection?.spec.servers ?? []);
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
                {selection && endpoint ? (
                    <EndpointHeader
                        method={endpoint.method}
                        path={endpoint.path}
                        summary={endpoint.summary}
                        deprecated={endpoint.deprecated}
                        collection={selection.spec.name}
                        servers={selection.spec.servers}
                        server={server}
                        onServerChange={setServer}
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
                    <div className="grid grid-cols-2 items-start gap-3">
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
                            className="h-[596px]"
                        />
                        <Card>
                            <p className="text-fg-muted text-sm">
                                {selection
                                    ? t('stressTests.resultsLater')
                                    : t('stressTests.pickRoute')}
                            </p>
                        </Card>
                    </div>
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
