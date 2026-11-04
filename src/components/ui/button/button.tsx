import type { VariantProps } from 'class-variance-authority';
import { cva } from 'class-variance-authority';
import type { ComponentProps } from 'react';

import { cn } from '@/lib/cn';

export const buttonVariants = cva(
    'inline-flex items-center justify-center gap-2 rounded-lg font-medium whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-50',
    {
        variants: {
            variant: {
                primary: 'bg-accent text-accent-fg hover:bg-accent/90',
                secondary: 'border border-border bg-surface-1 text-fg hover:bg-surface-2',
                ghost: 'text-fg-muted hover:bg-surface-2 hover:text-fg',
                danger: 'border border-danger/35 bg-danger/10 font-bold text-danger hover:bg-danger/15',
            },
            size: {
                sm: 'h-7 px-2.5 text-xs',
                md: 'h-9 px-4 text-control',
                icon: 'size-8',
            },
        },
        defaultVariants: { variant: 'secondary', size: 'md' },
    },
);

export type ButtonProps = ComponentProps<'button'> & VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, type = 'button', ...props }: ButtonProps) {
    return (
        <button
            type={type}
            className={cn(buttonVariants({ variant, size }), className)}
            {...props}
        />
    );
}
