import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { Tabs } from '@/components/ui/tabs';
import { config } from '@/config';
import {
    buildRequest,
    emptyDraft,
    pathParamNames,
    type RequestDraft,
    type RequestRoute,
} from '@/lib/request-draft';

import { RequestCard } from './request-card';
import { TestConfigBar } from './test-config-bar';
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

export interface StressTestPageProps {
    route?: RequestRoute | null;
    runId: string | undefined;
    onRunStarted: (runId: string) => void;
}

export function StressTestPage({ route = null, runId, onRunStarted }: StressTestPageProps) {
    const { t } = useTranslation();
    const [draft, setDraft] = useState<RequestDraft>(emptyDraft);
    const controls = useTestRunControls({
        target: route ? buildRequest(route, draft) : null,
        body: draft.body,
        runId,
        onRunStarted,
    });
    return (
        <>
            <PageHeader
                title={t('stressTests.title')}
                visuallyHidden
            />
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
                    className="grid grid-cols-2 items-start gap-3 pt-4"
                >
                    <RequestCard
                        draft={draft}
                        onDraftChange={setDraft}
                        pathParams={route ? pathParamNames(route.url) : []}
                        className="h-[596px]"
                    />
                    <Card>
                        <p className="text-fg-muted text-sm">{t('stressTests.pickRoute')}</p>
                    </Card>
                </Tabs.Panel>
            </Tabs.Root>
        </>
    );
}
