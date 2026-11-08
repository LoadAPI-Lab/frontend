import { useNavigate, useSearch } from '@tanstack/react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Sidebar } from '@/components/layout/sidebar';
import { useSidebarCollapsed } from '@/components/layout/use-sidebar-collapsed';
import { IconButton } from '@/components/ui/icon-button';
import { PlusIcon } from '@/components/ui/icons';
import { Tooltip } from '@/components/ui/tooltip';

import { CollectionsTree } from './collections-tree';
import { ImportDialog } from './import-dialog';
import { specNodeId } from './spec-tree';
import { useExpanded } from './use-expanded';

export function CollectionsSidebar() {
    const { t } = useTranslation();
    const [collapsed, setCollapsed] = useSidebarCollapsed();
    const navigate = useNavigate();
    const [expanded, setExpanded] = useExpanded();
    const [importing, setImporting] = useState(false);
    const openImport = () => setImporting(true);
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
                            search: { spec: specId, endpoint: endpointKey },
                        });
                    }}
                    onImport={openImport}
                />
            </Sidebar>
            <ImportDialog
                open={importing}
                onOpenChange={setImporting}
                onImported={(spec) => setExpanded(specNodeId(spec.id), true)}
            />
        </>
    );
}
