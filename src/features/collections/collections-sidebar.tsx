import { useTranslation } from 'react-i18next';

import { Sidebar } from '@/components/layout/sidebar';
import { useSidebarCollapsed } from '@/components/layout/use-sidebar-collapsed';
import { EmptyState } from '@/components/shared/empty-state';
import { IconButton } from '@/components/ui/icon-button';
import { PlusIcon, UploadIcon } from '@/components/ui/icons';
import { Tooltip } from '@/components/ui/tooltip';

// TODO(FE-08): tree of the user's saved docs. TODO(FE-09): both import buttons open the paste dialog.
export function CollectionsSidebar() {
    const { t } = useTranslation();
    const [collapsed, setCollapsed] = useSidebarCollapsed();

    return (
        <Sidebar
            title={t('collections.title')}
            collapsed={collapsed}
            onCollapsedChange={setCollapsed}
            actions={
                <Tooltip.Root>
                    <Tooltip.Trigger
                        render={
                            <IconButton aria-label={t('collections.importShort')}>
                                <PlusIcon />
                            </IconButton>
                        }
                    />
                    <Tooltip.Content>{t('collections.importShort')}</Tooltip.Content>
                </Tooltip.Root>
            }
            footer={
                <button
                    type="button"
                    className="border-border-dashed text-fg-muted hover:text-fg hover:border-fg-disabled focus-visible:ring-accent/40 flex h-9 w-full items-center justify-center gap-1.75 rounded-lg border border-dashed text-base transition-colors outline-none focus-visible:ring-2"
                >
                    <UploadIcon />
                    {t('collections.import')}
                </button>
            }
        >
            <EmptyState
                size="compact"
                icon={<UploadIcon />}
                title={t('collections.empty')}
                description={t('collections.emptyBody')}
            />
        </Sidebar>
    );
}
