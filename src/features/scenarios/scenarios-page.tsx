import { useQuery } from '@tanstack/react-query';
import { Workflow } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { ApiError } from '@/api/fetcher';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

import { ScenarioTabs, type TabTone } from './components/scenario-tabs';
import { scenarioQuery, scenariosQuery, type ScenarioSummary } from './scenario-api';
import { NEW_SCENARIO, useScenarioStore } from './scenario-store';
import { ScenarioWorkspace } from './scenario-workspace';

export interface ScenariosPageProps {
    scenario: string | undefined;
    onOpen: (scenario?: string) => void;
}

function PageSkeleton() {
    const { t } = useTranslation();
    return (
        <output
            aria-label={t('scenarios.loading')}
            aria-busy
            className="flex flex-col gap-3"
        >
            <div className="flex gap-1.5">
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-8 w-32" />
            </div>
            <Skeleton className="h-19" />
            <div className="flex gap-3">
                <Skeleton className="h-96 flex-1" />
                <Skeleton className="h-96 w-84" />
            </div>
        </output>
    );
}

export function ScenariosPage(props: ScenariosPageProps) {
    const { t } = useTranslation();
    return (
        <>
            <h1 className="sr-only">{t('scenarios.title')}</h1>
            <ScenariosContent {...props} />
        </>
    );
}

function ScenariosContent({ scenario, onOpen }: ScenariosPageProps) {
    const { t } = useTranslation();
    const list = useQuery(scenariosQuery);
    const store = useScenarioStore();
    const key = scenario ?? list.data?.[0]?.id ?? NEW_SCENARIO;
    const isNew = key === NEW_SCENARIO;
    const detail = useQuery({ ...scenarioQuery(key), enabled: !isNew && list.isSuccess });

    if (list.isPending) {
        return <PageSkeleton />;
    }
    if (list.isError) {
        return (
            <ErrorState
                message={list.error.message}
                onRetry={() => void list.refetch()}
                retrying={list.isRefetching}
            />
        );
    }

    const toneOf = (id: string): TabTone => {
        if (store.drafts[id]) {
            return 'unsaved';
        }
        const outcome = store.runs[id]?.outcome;
        return outcome ?? 'none';
    };
    const newDraft = store.drafts[NEW_SCENARIO];
    const showNewTab = isNew || newDraft !== undefined;
    const tabs = (
        <ScenarioTabs
            tabs={[
                ...list.data.map((item: ScenarioSummary) => ({
                    key: item.id,
                    name: store.drafts[item.id]?.name ?? item.name,
                    tone: toneOf(item.id),
                })),
                ...(showNewTab
                    ? [
                          {
                              key: NEW_SCENARIO,
                              name: newDraft?.name || t('scenarios.newScenario'),
                              tone: newDraft ? ('unsaved' as const) : ('none' as const),
                          },
                      ]
                    : []),
            ]}
            activeKey={key}
            newKey={NEW_SCENARIO}
            hasNewTab={showNewTab}
        />
    );

    if (!isNew && detail.isError) {
        const missing = detail.error instanceof ApiError && detail.error.status === 404;
        return (
            <>
                {tabs}
                {missing ? (
                    <EmptyState
                        icon={<Workflow />}
                        title={t('scenarios.notFound.title')}
                        description={t('scenarios.notFound.body')}
                        action={
                            <Button
                                variant="secondary"
                                onClick={() => onOpen()}
                            >
                                {t('scenarios.notFound.action')}
                            </Button>
                        }
                    />
                ) : (
                    <ErrorState
                        message={detail.error.message}
                        onRetry={() => void detail.refetch()}
                        retrying={detail.isRefetching}
                    />
                )}
            </>
        );
    }
    if (!isNew && detail.isPending) {
        return <PageSkeleton />;
    }

    return (
        <ScenarioWorkspace
            key={key}
            scenarioKey={key}
            saved={isNew ? null : (detail.data ?? null)}
            summary={list.data.find((item) => item.id === key) ?? null}
            tabs={tabs}
            onOpen={onOpen}
        />
    );
}
