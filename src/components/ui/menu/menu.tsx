import { Menu as BaseMenu } from '@base-ui/react/menu';

import { cn } from '@/lib/cn';

function Popup({
    className,
    align = 'end',
    sideOffset = 6,
    ...props
}: BaseMenu.Popup.Props & Pick<BaseMenu.Positioner.Props, 'align' | 'sideOffset'>) {
    return (
        <BaseMenu.Portal>
            <BaseMenu.Positioner
                align={align}
                sideOffset={sideOffset}
                className="z-50 outline-none"
            >
                <BaseMenu.Popup
                    className={cn(
                        'min-w-48 rounded-lg border border-border-strong bg-surface-raised p-1 shadow-xl shadow-black/40 outline-none',
                        'origin-(--transform-origin) transition-[opacity,transform] data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0',
                        className,
                    )}
                    {...props}
                />
            </BaseMenu.Positioner>
        </BaseMenu.Portal>
    );
}

function Item({ className, ...props }: BaseMenu.Item.Props) {
    return (
        <BaseMenu.Item
            className={cn(
                'text-md text-fg flex cursor-default items-center gap-2 rounded-md px-2 py-1.5 outline-none select-none',
                'data-highlighted:bg-surface-2 data-disabled:opacity-50 [&_svg]:size-3.5 [&_svg]:text-fg-muted',
                className,
            )}
            {...props}
        />
    );
}

function Separator({ className, ...props }: BaseMenu.Separator.Props) {
    return (
        <BaseMenu.Separator
            className={cn('bg-border-strong mx-1 my-1 h-px', className)}
            {...props}
        />
    );
}

export const Menu = {
    Root: BaseMenu.Root,
    Trigger: BaseMenu.Trigger,
    Popup,
    Item,
    Separator,
    Group: BaseMenu.Group,
    GroupLabel: BaseMenu.GroupLabel,
};
