import { Tabs as BaseTabs } from '@base-ui/react/tabs';

import { cn } from '@/lib/cn';

// Tier 1 keeps Base UI's compound API and only adds our styles.

function List({ className, ...props }: BaseTabs.List.Props) {
    return (
        <BaseTabs.List
            className={cn(
                'inline-flex items-center gap-1 rounded-lg border border-border bg-surface-1 p-1',
                className,
            )}
            {...props}
        />
    );
}

function Tab({ className, ...props }: BaseTabs.Tab.Props) {
    return (
        <BaseTabs.Tab
            className={cn(
                'rounded-md px-3 py-1 text-sm text-fg-muted transition-colors hover:text-fg aria-selected:bg-surface-2 aria-selected:text-fg',
                className,
            )}
            {...props}
        />
    );
}

function Panel({ className, ...props }: BaseTabs.Panel.Props) {
    return (
        <BaseTabs.Panel
            className={cn('outline-none', className)}
            {...props}
        />
    );
}

export const Tabs = { Root: BaseTabs.Root, List, Tab, Panel };
