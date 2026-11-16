import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { PlusIcon } from '@/components/ui/icons';
import { cn } from '@/lib/cn';

export type TabTone = 'none' | 'passed' | 'failed' | 'unsaved';

export interface ScenarioTab {
    key: string;
    name: string;
    tone: TabTone;
}

export interface ScenarioTabsProps {
    tabs: ScenarioTab[];
    activeKey: string;
    newKey: string;
    hasNewTab: boolean;
}

const dotClass: Record<TabTone, string> = {
    none: 'bg-fg-faint',
    passed: 'bg-accent',
    failed: 'bg-danger',
    unsaved: 'bg-warning',
};

const tabClass = (active: boolean) =>
    cn(
        'focus-visible:ring-accent/40 flex h-8 max-w-56 shrink-0 items-center gap-2 rounded-md border px-3 text-base outline-none focus-visible:ring-2',
        active
            ? 'border-border-strong bg-surface-raised text-fg font-semibold'
            : 'border-border text-fg-muted hover:text-fg hover:bg-surface-1',
    );

export function ScenarioTabs({ tabs, activeKey, newKey, hasNewTab }: ScenarioTabsProps) {
    const { t } = useTranslation();
    return (
        <nav aria-label={t('scenarios.tabsLabel')}>
            <ul className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                {tabs.map((tab) => (
                    <li key={tab.key}>
                        <Link
                            to="/scenarios"
                            search={{ scenario: tab.key }}
                            aria-current={tab.key === activeKey ? 'page' : undefined}
                            className={tabClass(tab.key === activeKey)}
                        >
                            <span
                                aria-hidden
                                className={cn('size-1.5 shrink-0 rounded-full', dotClass[tab.tone])}
                            />
                            <span className="truncate">
                                {tab.name.trim() || t('scenarios.untitled')}
                            </span>
                            {tab.tone === 'none' ? null : (
                                <span className="sr-only">
                                    {t(`scenarios.tabTone.${tab.tone}`)}
                                </span>
                            )}
                        </Link>
                    </li>
                ))}
                {hasNewTab ? null : (
                    <li>
                        <Link
                            to="/scenarios"
                            search={{ scenario: newKey }}
                            className={cn(tabClass(false), 'border-dashed')}
                        >
                            <PlusIcon aria-hidden />
                            {t('scenarios.newScenario')}
                        </Link>
                    </li>
                )}
            </ul>
        </nav>
    );
}
