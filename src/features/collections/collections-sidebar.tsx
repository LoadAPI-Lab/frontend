import { useNavigate, useRouterState, useSearch } from '@tanstack/react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Sidebar } from '@/components/layout/sidebar';
import { useSidebarCollapsed } from '@/components/layout/use-sidebar-collapsed';
import { IconButton } from '@/components/ui/icon-button';
import { PlusIcon } from '@/components/ui/icons';
import { toast } from '@/components/ui/toast';
import { Tooltip } from '@/components/ui/tooltip';
import { lastRunFor } from '@/lib/run-memory';

import type { ApiSpecSummary } from './api';
import { CollectionsRail } from './collections-rail';
import { CollectionsTree } from './collections-tree';
import { DeleteSpecDialog } from './delete-spec-dialog';
import { ImportDialog } from './import-dialog';
import type { SpecChanges } from './import-spec';
import { RenameSpecDialog } from './rename-spec-dialog';
import type { SpecAction } from './spec-actions';
import { specNodeId } from './spec-tree';
import { useExpanded } from './use-expanded';

interface PendingAction {
    action: SpecAction;
    spec: ApiSpecSummary;
}

function changesText(
    t: ReturnType<typeof useTranslation>['t'],
    { added, changed, removed }: SpecChanges,
) {
    if (added.length + changed.length + removed.length === 0) {
        return t('collections.reimported.noChanges');
    }
    return t('collections.reimported.changes', {
        added: added.length,
        changed: changed.length,
        removed: removed.length,
    });
}

export function CollectionsSidebar() {
    const { t } = useTranslation();
    const [savedCollapsed, setSavedCollapsed] = useSidebarCollapsed();
    const pathname = useRouterState({ select: (state) => state.location.pathname });
    const onHistory = pathname.startsWith('/history');
    const [visit, setVisit] = useState({ onHistory, open: false });
    if (visit.onHistory !== onHistory) {
        setVisit({ onHistory, open: false });
    }
    const collapsed = onHistory ? !visit.open : savedCollapsed;
    const setCollapsed = (next: boolean) => {
        if (onHistory) {
            setVisit({ onHistory, open: !next });
        } else {
            setSavedCollapsed(next);
        }
    };
    const navigate = useNavigate();
    const [expanded, setExpanded] = useExpanded();
    const [importing, setImporting] = useState(false);
    const openImport = () => setImporting(true);
    const [specAction, setSpecAction] = useState<PendingAction | null>(null);
    const [specActionOpen, setSpecActionOpen] = useState(false);
    const search = useSearch({ strict: false });
    const selected =
        search.spec && search.endpoint
            ? { specId: search.spec, endpointKey: search.endpoint }
            : null;

    return (
        <>
            <Sidebar
                title={t('collections.title')}
                collapsed={collapsed}
                onCollapsedChange={setCollapsed}
                rail={
                    <CollectionsRail
                        activeSpecId={selected?.specId ?? null}
                        onOpen={(specId) => {
                            setExpanded(specNodeId(specId), true);
                            setCollapsed(false);
                        }}
                    />
                }
                actions={
                    <Tooltip.Root>
                        <Tooltip.Trigger
                            render={
                                <IconButton
                                    aria-label={t('collections.importShort')}
                                    onClick={openImport}
                                >
                                    <PlusIcon />
                                </IconButton>
                            }
                        />
                        <Tooltip.Content>{t('collections.importShort')}</Tooltip.Content>
                    </Tooltip.Root>
                }
            >
                <CollectionsTree
                    selected={selected}
                    expanded={expanded}
                    onExpandedChange={setExpanded}
                    onSelect={({ specId, endpointKey }) => {
                        void navigate({
                            to: '/tests',
                            search: {
                                spec: specId,
                                endpoint: endpointKey,
                                run: lastRunFor({ spec: specId, endpoint: endpointKey }),
                            },
                        });
                    }}
                    onImport={openImport}
                    onSpecAction={(action, spec) => {
                        setSpecAction({ action, spec });
                        setSpecActionOpen(true);
                    }}
                />
            </Sidebar>
            <ImportDialog
                open={importing}
                onOpenChange={setImporting}
                onImported={({ spec }) => setExpanded(specNodeId(spec.id), true)}
            />
            {specAction?.action === 'rename' ? (
                <RenameSpecDialog
                    key={specAction.spec.id}
                    spec={specAction.spec}
                    open={specActionOpen}
                    onOpenChange={setSpecActionOpen}
                    onRenamed={(spec) =>
                        toast.success({ title: t('collections.renamed', { name: spec.name }) })
                    }
                />
            ) : null}
            {specAction?.action === 'reimport' ? (
                <ImportDialog
                    key={specAction.spec.id}
                    replacing={specAction.spec}
                    open={specActionOpen}
                    onOpenChange={setSpecActionOpen}
                    onImported={({ spec, changes }) => {
                        setExpanded(specNodeId(spec.id), true);
                        toast.success({
                            title: t('collections.reimported.title', { name: spec.name }),
                            description: changes ? changesText(t, changes) : undefined,
                        });
                    }}
                />
            ) : null}
            <DeleteSpecDialog
                spec={specAction?.action === 'delete' ? specAction.spec : null}
                open={specActionOpen && specAction?.action === 'delete'}
                onOpenChange={setSpecActionOpen}
                onDeleted={(spec) => {
                    setExpanded(specNodeId(spec.id), false);
                    toast.success({ title: t('collections.deleted', { name: spec.name }) });
                    if (selected?.specId === spec.id) {
                        void navigate({ to: '/tests', search: {} });
                    }
                }}
            />
        </>
    );
}
