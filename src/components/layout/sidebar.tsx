import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { IconButton } from '@/components/ui/icon-button';
import { ChevronLeftIcon } from '@/components/ui/icons';
import { Tooltip } from '@/components/ui/tooltip';
import { cn } from '@/lib/cn';

// Figma nodes 5:365 (frame), 5:366 (header), 5:494 (footer). 256px wide; collapses to a 48px rail.

export interface SidebarProps {
    id?: string;
    title: string;
    collapsed: boolean;
    onCollapsedChange: (collapsed: boolean) => void;
    /** Header buttons next to the title (e.g. import). Hidden when collapsed. */
    actions?: ReactNode;
    /** Pinned to the bottom (e.g. the dashed import button). Hidden when collapsed. */
    footer?: ReactNode;
    children: ReactNode;
}

export function Sidebar({
    id = 'app-sidebar',
    title,
    collapsed,
    onCollapsedChange,
    actions,
    footer,
    children,
}: SidebarProps) {
    const { t } = useTranslation();
    const toggleLabel = collapsed ? t('sidebar.expand') : t('sidebar.collapse');

    const toggle = (
        <Tooltip.Root>
            <Tooltip.Trigger
                render={
                    <IconButton
                        aria-label={toggleLabel}
                        aria-expanded={!collapsed}
                        // only reference the content while it is rendered
                        aria-controls={collapsed ? undefined : id}
                        onClick={() => onCollapsedChange(!collapsed)}
                    >
                        <ChevronLeftIcon className={cn(collapsed && '-scale-x-100')} />
                    </IconButton>
                }
            />
            <Tooltip.Content side="right">{toggleLabel}</Tooltip.Content>
        </Tooltip.Root>
    );

    return (
        <aside
            aria-label={title}
            className={cn(
                'border-divider flex shrink-0 flex-col border-r transition-[width] duration-200',
                collapsed ? 'w-12' : 'w-64',
            )}
        >
            {collapsed ? (
                <div className="flex justify-center pt-2.75">{toggle}</div>
            ) : (
                <>
                    <div className="border-divider flex h-12 shrink-0 items-center gap-2 border-b pr-3 pl-4">
                        <h2 className="text-fg-muted tracking-label flex-1 truncate text-xs font-semibold uppercase">
                            {title}
                        </h2>
                        {actions}
                        {toggle}
                    </div>
                    <div
                        id={id}
                        className="min-h-0 flex-1 overflow-y-auto px-2 py-2.5"
                    >
                        {children}
                    </div>
                    {footer ? (
                        <div className="border-divider shrink-0 border-t p-3">{footer}</div>
                    ) : null}
                </>
            )}
        </aside>
    );
}
