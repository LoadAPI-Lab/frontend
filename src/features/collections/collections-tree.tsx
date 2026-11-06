import { useQueries, useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronRight, Folder } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { type TreeNode, TreeView } from '@/components/shared/tree-view';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { UploadIcon } from '@/components/ui/icons';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/cn';
import { methodColorClass } from '@/lib/http-method';

import {
    type ApiSpec,
    type ApiSpecSummary,
    apiSpecQuery,
    apiSpecsQuery,
    type Endpoint,
} from './api';
import {
    endpointNodeId,
    folderNodeId,
    groupEndpoints,
    specInitials,
    specNodeId,
} from './spec-tree';

function splitPath(path: string) {
    const index = path.lastIndexOf('/');
    return index > 0
        ? { head: path.slice(0, index), tail: path.slice(index) }
        : { head: '', tail: path };
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
}

function Chevron({ open, className }: { open: boolean; className?: string }) {
    const Icon = open ? ChevronDown : ChevronRight;
    return (
        <Icon
            aria-hidden
            className={cn('text-fg-muted size-2.5 shrink-0', className)}
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
}: CollectionsTreeProps) {
    const { t } = useTranslation();
    const specs = useQuery(apiSpecsQuery);
    const openSpecIds = (specs.data ?? [])
        .map((spec) => spec.id)
        .filter((id) => expanded.has(specNodeId(id)));
    const details = useQueries({ queries: openSpecIds.map((id) => apiSpecQuery(id)) });
    const detailById = new Map(openSpecIds.map((id, index) => [id, details[index]]));

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

    const endpointNode = (spec: ApiSpecSummary, endpoint: Endpoint, indent: string): TreeNode => {
        const isSelected = selected?.specId === spec.id && selected.endpointKey === endpoint.key;
        const { head, tail } = splitPath(endpoint.path);
        return {
            id: endpointNodeId(spec.id, endpoint.key),
            tooltip: endpoint.path,
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
                        <span className="min-w-0 shrink-[100] truncate">{head}</span>
                        <span className="min-w-0 truncate">{tail}</span>
                    </span>
                    <span className="sr-only">{endpoint.path}</span>
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

    const specChildren = (spec: ApiSpecSummary, detail: ApiSpec): TreeNode[] => {
        const { folders, untagged } = groupEndpoints(detail.endpoints);
        return [
            ...folders.map((folder): TreeNode => {
                const id = folderNodeId(spec.id, folder.tag);
                const open = expanded.has(id);
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

    const nodes = specs.data.map((spec): TreeNode => {
        const id = specNodeId(spec.id);
        const open = expanded.has(id);
        const detail = detailById.get(spec.id);
        const active = open || selected?.specId === spec.id;
        return {
            id,
            rowClassName: cn(
                'flex h-8.5 items-center gap-2 rounded-item px-2 transition-colors',
                open ? 'bg-surface-input' : 'hover:bg-surface-input',
            ),
            busy: detail?.isPending,
            pending: <PendingRows />,
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
                        {spec.endpointsCount}
                    </span>
                    <span className="sr-only">
                        {t('collections.endpointCount', { count: spec.endpointsCount })}
                    </span>
                </>
            ),
            children: detail?.data ? specChildren(spec, detail.data) : [],
        };
    });

    const failed = openSpecIds.filter((id) => detailById.get(id)?.isError);

    return (
        <div className="flex flex-col gap-1 px-2 py-2.5">
            <TreeView
                nodes={nodes}
                aria-label={t('collections.title')}
                expandedIds={expanded}
                onExpandedChange={onExpandedChange}
                selectedId={selected ? endpointNodeId(selected.specId, selected.endpointKey) : null}
                onSelect={(node) => {
                    const [, specId = '', ...key] = node.id.split(':');
                    onSelect({ specId, endpointKey: key.join(':') });
                }}
                className="flex flex-col gap-1"
            />
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
