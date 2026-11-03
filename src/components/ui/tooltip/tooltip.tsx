import { Tooltip as BaseTooltip } from '@base-ui/react/tooltip';

import { cn } from '@/lib/cn';

// Tier 1: Base UI Tooltip. Usage:
// <Tooltip.Root><Tooltip.Trigger render={<IconButton aria-label="Collapse sidebar">…</IconButton>} />
//   <Tooltip.Content>Collapse sidebar</Tooltip.Content></Tooltip.Root>
// Tooltips repeat visible or aria-label text; never put essential information only in a tooltip.

function Content({
    className,
    side = 'top',
    sideOffset = 6,
    ...props
}: BaseTooltip.Popup.Props & Pick<BaseTooltip.Positioner.Props, 'side' | 'sideOffset'>) {
    return (
        <BaseTooltip.Portal>
            <BaseTooltip.Positioner
                side={side}
                sideOffset={sideOffset}
                className="z-50"
            >
                <BaseTooltip.Popup
                    className={cn(
                        'text-sm text-fg rounded-md border border-border-strong bg-surface-raised px-2 py-1 shadow-lg shadow-black/40',
                        'origin-(--transform-origin) transition-[opacity,transform] data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0',
                        className,
                    )}
                    {...props}
                />
            </BaseTooltip.Positioner>
        </BaseTooltip.Portal>
    );
}

export const Tooltip = {
    Provider: BaseTooltip.Provider,
    Root: BaseTooltip.Root,
    Trigger: BaseTooltip.Trigger,
    Content,
};
