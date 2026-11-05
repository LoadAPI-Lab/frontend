import { useTranslation } from 'react-i18next';

import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { Tabs } from '@/components/ui/tabs';
import { config } from '@/config';

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
    runId: string | undefined;
    onRunStarted: (runId: string) => void;
}

export function StressTestPage({ runId, onRunStarted }: StressTestPageProps) {
    const { t } = useTranslation();
    const controls = useTestRunControls({ target: null, body: '', runId, onRunStarted });
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
                    className="pt-4"
                >
                    <Card>
                        <p className="text-fg-muted text-sm">{t('stressTests.pickRoute')}</p>
                    </Card>
                </Tabs.Panel>
            </Tabs.Root>
        </>
    );
}
