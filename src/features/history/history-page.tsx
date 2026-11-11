import { useInfiniteQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { Tabs } from '@/components/ui/tabs';

import { HISTORY_TYPES, type HistoryStatus, type HistoryType, historyQuery } from './history-api';
import { filterRuns, normalizeQuery } from './history-filter';
import { HistoryToolbar } from './history-toolbar';
import { RunDetail } from './run-detail';
import { RunsList } from './runs-list';

const ALL = 'all';

export interface HistoryFilters {
    type?: HistoryType;
    status?: HistoryStatus;
    query?: string;
    grouped?: boolean;
}

export interface HistoryPageProps {
    runId: string | undefined;
    filters: HistoryFilters;
    onFiltersChange: (filters: HistoryFilters, options: { replace: boolean }) => void;
    onRunChange: (runId: string) => void;
}

const isHistoryType = (value: unknown): value is HistoryType =>
    HISTORY_TYPES.some((type) => type === value);

export function HistoryPage({ runId, filters, onFiltersChange, onRunChange }: HistoryPageProps) {
    const { t } = useTranslation();
    const { type, status, query, grouped = true } = filters;
    const history = useInfiniteQuery(historyQuery(type, status));
    const items = history.data?.pages.flatMap((page) => page.items) ?? [];
    const visible = filterRuns(items, query);
    const searching = normalizeQuery(query) !== '';
    const filtered = type !== undefined || status !== undefined || searching;
    const firstId = visible[0]?.id;
    const changeFilters = (patch: HistoryFilters, replace = false) => {
        onFiltersChange({ ...filters, ...patch }, { replace });
    };

    useEffect(() => {
        if (!runId && firstId) {
            onRunChange(firstId);
        }
    }, [runId, firstId, onRunChange]);

    return (
        <>
            <PageHeader
                title={t('history.title')}
                visuallyHidden
            />
            <div className="grid min-h-0 flex-1 grid-cols-[22rem_minmax(0,1fr)] gap-4">
                <aside className="flex min-h-0 flex-col gap-3 overflow-y-auto pr-1">
                    <div className="flex items-baseline justify-between gap-2 px-1">
                        <h2 className="text-fg text-xl font-bold">{t('history.runs')}</h2>
                        {items.length > 0 ? (
                            <span className="text-fg-muted font-mono text-sm">
                                {history.hasNextPage || searching
                                    ? t('history.showing', { count: visible.length })
                                    : t('history.totalCount', { count: visible.length })}
                            </span>
                        ) : null}
                    </div>
                    <Tabs.Root
                        value={type ?? ALL}
                        onValueChange={(value) =>
                            changeFilters({ type: isHistoryType(value) ? value : undefined })
                        }
                    >
                        <Tabs.List
                            aria-label={t('history.filterLabel')}
                            className="w-full"
                        >
                            <Tabs.Tab value={ALL}>{t('history.filters.all')}</Tabs.Tab>
                            {HISTORY_TYPES.map((value) => (
                                <Tabs.Tab
                                    key={value}
                                    value={value}
                                >
                                    {t(`history.types.${value}`)}
                                </Tabs.Tab>
                            ))}
                        </Tabs.List>
                    </Tabs.Root>
                    <HistoryToolbar
                        query={query}
                        status={status}
                        grouped={grouped}
                        onQueryChange={(next) => changeFilters({ query: next || undefined }, true)}
                        onStatusChange={(next) => changeFilters({ status: next ?? undefined })}
                        onGroupedChange={(next) => changeFilters({ grouped: next })}
                    />
                    <RunsList
                        type={type}
                        status={status}
                        query={query}
                        grouped={grouped}
                        filtered={filtered}
                        onClearFilters={() => onFiltersChange({ grouped }, { replace: false })}
                        selectedId={runId}
                    />
                </aside>
                <section className="min-h-0 overflow-y-auto">
                    {runId ? (
                        <RunDetail
                            key={runId}
                            runId={runId}
                            listItems={items}
                        />
                    ) : (
                        <EmptyState
                            title={t('history.pick.title')}
                            description={t('history.pick.body')}
                        />
                    )}
                </section>
            </div>
        </>
    );
}
