import { useQueries, useQuery } from '@tanstack/react-query';
import { ChevronRight, Folder, LoaderCircle } from 'lucide-react';
import { type DragEvent, type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useActiveRun } from '@/api/live';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { type TreeNode, TreeView } from '@/components/shared/tree-view';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { UploadIcon } from '@/components/ui/icons';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/cn';
import { methodColorClass } from '@/lib/http-method';
import { isScratchPlace } from '@/lib/run-memory';

import {
    type ApiSpec,
    type ApiSpecSummary,
    apiSpecQuery,
    apiSpecsQuery,
    type Endpoint,
} from './api';
import { type SpecAction, SpecActions } from './spec-actions';
import {
    endpointMatches,
    endpointNodeId,
    folderNodeId,
    groupEndpoints,
    matchRanges,
    type Range,
    searchTerms,
    specInitials,
    specNodeId,
    splitDisplayPath,
} from './spec-tree';

function highlight(text: string, ranges: readonly Range[], offset: number): ReactNode {
    const parts: ReactNode[] = [];
    let cursor = 0;
    for (const [start, end] of ranges) {
        const from = Math.max(start - offset, cursor);
        const to = Math.min(end - offset, text.length);
        if (to <= from) {
            continue;
        }
        parts.push(text.slice(cursor, from));
        parts.push(
            <mark
                key={from}
                className="bg-accent/20 rounded-xs text-inherit"
            >
                {text.slice(from, to)}
            </mark>,
        );
        cursor = to;
    }
    parts.push(text.slice(cursor));
    return parts;
}

interface SearchView {
    terms: string;
    toggled: ReadonlyMap<string, boolean>;
}

export interface EndpointSelection {
    specId: string;
    endpointKey: string;
}

export interface CollectionsTreeProps {
    selected: EndpointSelection | null;
    onSelect: (selection: EndpointSelection) => void;
    expanded: ReadonlySet<string>;
    onExpandedChange: (id: string, open: boolean) => void;
    onImport?: () => void;
    onSpecAction?: (action: SpecAction, spec: ApiSpecSummary) => void;
    onEndpointDragStart?: (specId: string, endpoint: Endpoint, event: DragEvent) => void;
    query?: string;
}

function Chevron({ open, className }: { open: boolean; className?: string }) {
    return (
        <ChevronRight
            aria-hidden
            className={cn(
                'text-fg-muted size-2.5 shrink-0 transition-transform duration-150 motion-reduce:transition-none',
                open && 'rotate-90',
                className,
            )}
        />
    );
}

function PendingRows() {
    return (
        <div className="flex flex-col gap-1.5 py-1.5 pr-2 pl-8">
            <Skeleton className="h-4" />
            <Skeleton className="h-4 w-3/4" />
        </div>
    );
}

export function CollectionsTree({
    selected,
    onSelect,
    expanded,
    onExpandedChange,
    onImport,
    onSpecAction,
    onEndpointDragStart,
    query = '',
}: CollectionsTreeProps) {
    const { t } = useTranslation();
    const [menuFor, setMenuFor] = useState<string | null>(null);
    const specs = useQuery(apiSpecsQuery);
    const activePlace = useActiveRun().active?.place;
    const runningPlace = isScratchPlace(activePlace) ? undefined : activePlace;
    const terms = searchTerms(query);
    const searching = terms.length > 0;
    const termsKey = terms.join(' ');
    const [searchView, setSearchView] = useState<SearchView>({
        terms: termsKey,
        toggled: new Map(),
    });
    if (searchView.terms !== termsKey) {
        setSearchView({ terms: termsKey, toggled: new Map() });
    }
    const openSpecIds = (specs.data ?? [])
        .map((spec) => spec.id)
        .filter((id) => searching || expanded.has(specNodeId(id)));
    const details = useQueries({ queries: openSpecIds.map((id) => apiSpecQuery(id)) });
    const detailById = new Map(openSpecIds.map((id, index) => [id, details[index]]));
    const matchingOf = (detail: ApiSpec) =>
        searching
            ? detail.endpoints.filter((endpoint) => endpointMatches(endpoint, terms))
            : detail.endpoints;

    if (specs.isPending) {
        return (
            <output
                aria-label={t('collections.loading')}
                aria-busy
                className="flex flex-col gap-2 p-2"
            >
                <Skeleton className="h-8.5" />
                <Skeleton className="h-8.5" />
                <Skeleton className="h-8.5" />
            </output>
        );
    }

    if (specs.isError) {
        return (
            <ErrorState
                size="compact"
                message={specs.error.message}
                onRetry={() => void specs.refetch()}
                retrying={specs.isRefetching}
            />
        );
    }

    if (specs.data.length === 0) {
        return (
            <EmptyState
                size="compact"
                icon={<UploadIcon />}
                title={t('collections.empty')}
                description={t('collections.emptyBody')}
                action={
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={onImport}
                    >
                        {t('collections.importShort')}
                    </Button>
                }
            />
        );
    }

    const searchExpanded = new Set<string>();
    if (searching) {
        for (const spec of specs.data) {
            const data = detailById.get(spec.id)?.data;
            const matching = data ? matchingOf(data) : [];
            if (data && matching.length === 0) {
                continue;
            }
            searchExpanded.add(specNodeId(spec.id));
            for (const folder of groupEndpoints(matching).folders) {
                searchExpanded.add(folderNodeId(spec.id, folder.tag));
            }
        }
        for (const [toggledId, open] of searchView.toggled) {
            if (open) {
                searchExpanded.add(toggledId);
            } else {
                searchExpanded.delete(toggledId);
            }
        }
    }
    const shownExpanded: ReadonlySet<string> = searching ? searchExpanded : expanded;
    const changeExpanded = (id: string, open: boolean) => {
        if (!searching) {
            onExpandedChange(id, open);
            return;
        }
        setSearchView((view) => ({ ...view, toggled: new Map(view.toggled).set(id, open) }));
    };

    const endpointNode = (spec: ApiSpecSummary, endpoint: Endpoint, indent: string): TreeNode => {
        const isSelected = selected?.specId === spec.id && selected.endpointKey === endpoint.key;
        const isRunning = runningPlace?.spec === spec.id && runningPlace.endpoint === endpoint.key;
        const { head, tail } = splitDisplayPath(endpoint.path);
        const ranges = searching ? matchRanges(endpoint.path, terms) : [];
        return {
            id: endpointNodeId(spec.id, endpoint.key),
            tooltip: (
                <span className="flex max-w-80 flex-col gap-0.5">
                    <span className="font-mono break-all">{endpoint.path}</span>
                    {endpoint.summary ? (
                        <span className="text-fg-secondary">{endpoint.summary}</span>
                    ) : null}
                </span>
            ),
            onDragStart: onEndpointDragStart
                ? (event) => onEndpointDragStart(spec.id, endpoint, event)
                : undefined,
            rowClassName: cn(
                'flex h-7 items-center gap-2 rounded-md border-l-2 px-2 transition-colors',
                indent,
                isSelected
                    ? 'bg-surface-selected border-accent'
                    : 'hover:bg-surface-input border-transparent',
            ),
            content: (
                <>
                    <span
                        className={cn(
                            'text-2xs w-9.5 shrink-0 font-mono font-extrabold',
                            methodColorClass(endpoint.method),
                        )}
                    >
                        {endpoint.method}
                    </span>{' '}
                    <span
                        aria-hidden
                        className={cn(
                            'text-label flex min-w-0 flex-1 font-mono',
                            isSelected ? 'text-fg' : 'text-fg-secondary',
                        )}
                    >
                        {head ? (
                            <span className="min-w-2 truncate">{highlight(head, ranges, 0)}</span>
                        ) : null}
                        <span className="max-w-full shrink-0 truncate">
                            {highlight(tail, ranges, head.length)}
                        </span>
                    </span>
                    <span className="sr-only">{endpoint.path}</span>
                    {isRunning ? (
                        <>
                            <LoaderCircle
                                aria-hidden
                                data-testid="endpoint-running"
                                className="text-accent size-3 shrink-0 motion-safe:animate-spin"
                            />
                            <span className="sr-only">{t('collections.running')}</span>
                        </>
                    ) : null}
                    {endpoint.deprecated ? (
                        <>
                            {' '}
                            <Badge
                                variant="outline"
                                className="text-2xs shrink-0 px-1 py-0.5 font-sans"
                            >
                                <span aria-hidden>{t('collections.deprecatedShort')}</span>
                                <span className="sr-only">{t('collections.deprecated')}</span>
                            </Badge>
                        </>
                    ) : null}
                </>
            ),
        };
    };

    const specChildren = (spec: ApiSpecSummary, endpoints: Endpoint[]): TreeNode[] => {
        const { folders, untagged } = groupEndpoints(endpoints);
        return [
            ...folders.map((folder): TreeNode => {
                const id = folderNodeId(spec.id, folder.tag);
                const open = shownExpanded.has(id);
                return {
                    id,
                    rowClassName:
                        'hover:bg-surface-input ml-4.5 flex h-7 items-center gap-1.75 rounded-md px-2',
                    content: (
                        <>
                            <Chevron
                                open={open}
                                className="size-2.25"
                            />
                            <Folder
                                aria-hidden
                                className="text-fg-muted size-3 shrink-0"
                            />
                            <span className="text-fg-muted min-w-0 flex-1 truncate text-base">
                                {folder.tag}
                            </span>
                            <span
                                aria-hidden
                                className="text-fg-muted font-mono text-xs"
                            >
                                {folder.endpoints.length}
                            </span>
                            <span className="sr-only">
                                {t('collections.endpointCount', { count: folder.endpoints.length })}
                            </span>
                        </>
                    ),
                    children: folder.endpoints.map((endpoint) =>
                        endpointNode(spec, endpoint, 'ml-8'),
                    ),
                };
            }),
            ...untagged.map((endpoint) => endpointNode(spec, endpoint, 'ml-4.5')),
        ];
    };

    const nodes = specs.data.flatMap((spec): TreeNode[] => {
        const id = specNodeId(spec.id);
        const open = shownExpanded.has(id);
        const detail = detailById.get(spec.id);
        const endpoints = detail?.data ? matchingOf(detail.data) : [];
        if (searching && (detail?.isError || (detail?.data && endpoints.length === 0))) {
            return [];
        }
        const count = searching ? endpoints.length : spec.endpointsCount;
        const active = open || selected?.specId === spec.id;
        return [
            {
                id,
                rowClassName: cn(
                    'flex h-8.5 items-center gap-2 rounded-item px-2 transition-colors',
                    open ? 'bg-surface-input' : 'hover:bg-surface-input',
                ),
                busy: detail?.isPending,
                pending: <PendingRows />,
                onOpenActions: onSpecAction ? () => setMenuFor(spec.id) : undefined,
                actions: onSpecAction ? (
                    <SpecActions
                        name={spec.name}
                        open={menuFor === spec.id}
                        onOpenChange={(menuOpen) => setMenuFor(menuOpen ? spec.id : null)}
                        onAction={(action) => onSpecAction(action, spec)}
                        deleteBlocked={runningPlace?.spec === spec.id}
                    />
                ) : undefined,
                content: (
                    <>
                        <Chevron open={open} />
                        <span
                            aria-hidden
                            className={cn(
                                'text-2xs flex size-5.5 shrink-0 items-center justify-center rounded-sm font-mono font-extrabold',
                                active ? 'bg-accent text-accent-fg' : 'bg-surface-2 text-fg-badge',
                            )}
                        >
                            {specInitials(spec.name)}
                        </span>
                        <span className="text-md text-fg min-w-0 flex-1 truncate font-semibold">
                            {spec.name}
                        </span>
                        <span
                            aria-hidden
                            className="text-fg-muted font-mono text-xs"
                        >
                            {count}
                        </span>
                        <span className="sr-only">
                            {searching
                                ? t('collections.search.matchCount', { count })
                                : t('collections.endpointCount', { count })}
                        </span>
                    </>
                ),
                children: detail?.data ? specChildren(spec, endpoints) : [],
            },
        ];
    });

    const failed = openSpecIds.filter((id) => detailById.get(id)?.isError);
    const noMatches = searching && nodes.length === 0 && failed.length === 0;

    return (
        <div className="flex flex-col gap-1 px-2 py-2.5">
            {noMatches ? (
                <EmptyState
                    size="compact"
                    title={t('collections.search.noMatch')}
                    description={t('collections.search.noMatchBody')}
                />
            ) : (
                <TreeView
                    nodes={nodes}
                    aria-label={t('collections.title')}
                    expandedIds={shownExpanded}
                    onExpandedChange={changeExpanded}
                    selectedId={
                        selected ? endpointNodeId(selected.specId, selected.endpointKey) : null
                    }
                    onSelect={(node) => {
                        const [, specId = '', ...key] = node.id.split(':');
                        onSelect({ specId, endpointKey: key.join(':') });
                    }}
                    className="flex flex-col gap-1"
                />
            )}
            {failed.length > 0 ? (
                <ErrorState
                    size="compact"
                    title={t('collections.endpointsFailed')}
                    onRetry={() => {
                        for (const id of failed) {
                            void detailById.get(id)?.refetch();
                        }
                    }}
                />
            ) : null}
        </div>
    );
}
