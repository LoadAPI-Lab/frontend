import { Select as BaseSelect } from '@base-ui/react/select';
import { Check, ChevronDown } from 'lucide-react';

import { controlBase } from '@/components/ui/field/control-styles';
import { cn } from '@/lib/cn';

// Tier 1: Base UI Select. Usage:
// <Select.Root items={items}><Select.Trigger><Select.Value /></Select.Trigger>
//   <Select.Popup>{items.map(i => <Select.Item key={i.value} value={i.value}>{i.label}</Select.Item>)}</Select.Popup>
// </Select.Root>

function Trigger({ className, children, ...props }: BaseSelect.Trigger.Props) {
    return (
        <BaseSelect.Trigger
            className={cn(
                controlBase,
                'flex h-9 items-center justify-between gap-2 px-2.75 text-left',
                className,
            )}
            {...props}
        >
            {children}
            <BaseSelect.Icon className="text-fg-muted">
                <ChevronDown
                    aria-hidden
                    className="size-3.5"
                />
            </BaseSelect.Icon>
        </BaseSelect.Trigger>
    );
}

function Value({ className, ...props }: BaseSelect.Value.Props) {
    return (
        <BaseSelect.Value
            className={cn('truncate data-placeholder:text-fg-subtle', className)}
            {...props}
        />
    );
}

/** Portal + positioner + popup + list in one part, since we always need all four. */
function Popup({ className, children, ...props }: BaseSelect.Popup.Props) {
    return (
        <BaseSelect.Portal>
            <BaseSelect.Positioner
                sideOffset={6}
                className="z-50 outline-none"
            >
                <BaseSelect.Popup
                    className={cn(
                        'min-w-(--anchor-width) rounded-lg border border-border-strong bg-surface-raised p-1 shadow-xl shadow-black/40',
                        'origin-(--transform-origin) transition-[opacity,transform] data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0',
                        className,
                    )}
                    {...props}
                >
                    <BaseSelect.List className="max-h-72 overflow-y-auto outline-none">
                        {children}
                    </BaseSelect.List>
                </BaseSelect.Popup>
            </BaseSelect.Positioner>
        </BaseSelect.Portal>
    );
}

function Item({ className, children, ...props }: BaseSelect.Item.Props) {
    return (
        <BaseSelect.Item
            className={cn(
                'text-md text-fg flex cursor-default items-center justify-between gap-3 rounded-md px-2 py-1.5 outline-none select-none',
                'data-highlighted:bg-surface-2 data-disabled:opacity-50',
                className,
            )}
            {...props}
        >
            <BaseSelect.ItemText>{children}</BaseSelect.ItemText>
            <BaseSelect.ItemIndicator className="text-accent">
                <Check
                    aria-hidden
                    className="size-3.5"
                />
            </BaseSelect.ItemIndicator>
        </BaseSelect.Item>
    );
}

export const Select = {
    Root: BaseSelect.Root,
    Label: BaseSelect.Label,
    Trigger,
    Value,
    Popup,
    Item,
    Group: BaseSelect.Group,
    GroupLabel: BaseSelect.GroupLabel,
    Separator: BaseSelect.Separator,
};
