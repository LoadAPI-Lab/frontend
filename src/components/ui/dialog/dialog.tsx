import { AlertDialog as BaseAlertDialog } from '@base-ui/react/alert-dialog';
import { Dialog as BaseDialog } from '@base-ui/react/dialog';
import type { ComponentProps } from 'react';

import { cn } from '@/lib/cn';

const backdropClass =
    'fixed inset-0 bg-black/60 transition-opacity data-ending-style:opacity-0 data-starting-style:opacity-0';
const popupClass = cn(
    'bg-surface-1 border-border-strong text-fg fixed top-1/2 left-1/2 flex max-h-[85dvh] w-[560px] max-w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-card border p-5 shadow-2xl outline-none',
    'transition-[opacity,scale] data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0',
);
const titleClass = 'text-lg font-semibold tracking-tight';
const descriptionClass = 'text-fg-muted text-base';

function Popup({ className, children, ...props }: BaseDialog.Popup.Props) {
    return (
        <BaseDialog.Portal>
            <BaseDialog.Backdrop className={backdropClass} />
            <BaseDialog.Popup
                className={cn(popupClass, className)}
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
            className={cn(titleClass, className)}
            {...props}
        />
    );
}

function Description({ className, ...props }: BaseDialog.Description.Props) {
    return (
        <BaseDialog.Description
            className={cn(descriptionClass, className)}
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

function AlertPopup({ className, children, ...props }: BaseAlertDialog.Popup.Props) {
    return (
        <BaseAlertDialog.Portal>
            <BaseAlertDialog.Backdrop className={backdropClass} />
            <BaseAlertDialog.Popup
                className={cn(popupClass, 'w-[440px]', className)}
                {...props}
            >
                {children}
            </BaseAlertDialog.Popup>
        </BaseAlertDialog.Portal>
    );
}

function AlertTitle({ className, ...props }: BaseAlertDialog.Title.Props) {
    return (
        <BaseAlertDialog.Title
            className={cn(titleClass, className)}
            {...props}
        />
    );
}

function AlertDescription({ className, ...props }: BaseAlertDialog.Description.Props) {
    return (
        <BaseAlertDialog.Description
            className={cn(descriptionClass, className)}
            {...props}
        />
    );
}

export const AlertDialog = {
    Root: BaseAlertDialog.Root,
    Trigger: BaseAlertDialog.Trigger,
    Close: BaseAlertDialog.Close,
    Popup: AlertPopup,
    Title: AlertTitle,
    Description: AlertDescription,
    Footer,
};
