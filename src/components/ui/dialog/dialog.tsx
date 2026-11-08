import { Dialog as BaseDialog } from '@base-ui/react/dialog';
import type { ComponentProps } from 'react';

import { cn } from '@/lib/cn';

function Popup({ className, children, ...props }: BaseDialog.Popup.Props) {
    return (
        <BaseDialog.Portal>
            <BaseDialog.Backdrop className="fixed inset-0 bg-black/60 transition-opacity data-ending-style:opacity-0 data-starting-style:opacity-0" />
            <BaseDialog.Popup
                className={cn(
                    'bg-surface-1 border-border-strong text-fg fixed top-1/2 left-1/2 flex max-h-[85dvh] w-[560px] max-w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-card border p-5 shadow-2xl outline-none',
                    'transition-[opacity,scale] data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0',
                    className,
                )}
                {...props}
            >
                {children}
            </BaseDialog.Popup>
        </BaseDialog.Portal>
    );
}

function Title({ className, ...props }: BaseDialog.Title.Props) {
    return (
        <BaseDialog.Title
            className={cn('text-lg font-semibold tracking-tight', className)}
            {...props}
        />
    );
}

function Description({ className, ...props }: BaseDialog.Description.Props) {
    return (
        <BaseDialog.Description
            className={cn('text-fg-muted text-base', className)}
            {...props}
        />
    );
}

function Footer({ className, ...props }: ComponentProps<'div'>) {
    return (
        <div
            className={cn('flex items-center justify-end gap-2', className)}
            {...props}
        />
    );
}

export const Dialog = {
    Root: BaseDialog.Root,
    Trigger: BaseDialog.Trigger,
    Close: BaseDialog.Close,
    Popup,
    Title,
    Description,
    Footer,
};
