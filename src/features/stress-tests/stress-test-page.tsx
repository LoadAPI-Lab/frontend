import { useTranslation } from 'react-i18next';

import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { Tabs } from '@/components/ui/tabs';
import { config } from '@/config';

const modes = [
    { value: 'single', labelKey: 'stressTests.modes.single', enabled: true },
    { value: 'batch', labelKey: 'stressTests.modes.batch', enabled: config.features.batch },
    {
        value: 'roundRobin',
        labelKey: 'stressTests.modes.roundRobin',
        enabled: config.features.roundRobin,
    },
] as const;

export function StressTestPage() {
    const { t } = useTranslation();
    return (
        <>
            <PageHeader
                title={t('stressTests.title')}
                visuallyHidden
            />
            <Tabs.Root defaultValue="single">
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
