import { Field as BaseField } from '@base-ui/react/field';
import { NumberField as BaseNumberField } from '@base-ui/react/number-field';
import type { ComponentProps } from 'react';

import { cn } from '@/lib/cn';

function Root(props: BaseNumberField.Root.Props) {
    return <BaseNumberField.Root {...props} />;
}

function Group({ className, ...props }: BaseNumberField.Group.Props) {
    return (
        <BaseNumberField.Group
            className={cn(
                'flex h-9 items-center gap-2.25 rounded-lg border border-border-strong bg-surface-input px-2.75 transition-colors',
                'hover:border-fg-disabled has-focus-visible:border-accent/60 has-focus-visible:ring-2 has-focus-visible:ring-accent/25',
                'has-data-invalid:border-danger/60 has-data-disabled:opacity-50',
                className,
            )}
            {...props}
        />
    );
}

function InlineLabel({ className, ...props }: BaseField.Label.Props) {
    return (
        <BaseField.Label
            className={cn('text-label text-fg-muted shrink-0 whitespace-nowrap', className)}
            {...props}
        />
    );
}

function Input({ className, ...props }: BaseNumberField.Input.Props) {
    return (
        <BaseNumberField.Input
            className={cn(
                'text-md text-fg w-12 min-w-0 bg-transparent font-mono font-bold tabular-nums outline-none',
                className,
            )}
            {...props}
        />
    );
}

function Suffix({ className, ...props }: ComponentProps<'span'>) {
    return (
        <span
            aria-hidden
            className={cn('text-md text-fg-muted -ml-2 font-mono font-bold', className)}
            {...props}
        />
    );
}

export const NumberField = {
    Root,
    Group,
    InlineLabel,
    Input,
    Suffix,
    Increment: BaseNumberField.Increment,
    Decrement: BaseNumberField.Decrement,
};
