import type { VariantProps } from 'class-variance-authority';
import { cva } from 'class-variance-authority';
import type { ComponentProps } from 'react';

import { cn } from '@/lib/cn';

const iconButton = cva(
    'inline-flex shrink-0 items-center justify-center rounded-md border transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-3',
    {
        variants: {
            variant: {
                secondary:
                    'border-border-strong bg-surface-input text-fg-muted hover:text-fg hover:bg-surface-2',
                ghost: 'border-transparent text-fg-muted hover:text-fg hover:bg-surface-2',
            },
            size: {
                sm: 'size-6.5',
                md: 'size-8 [&_svg]:size-3.5',
            },
        },
        defaultVariants: { variant: 'secondary', size: 'sm' },
    },
);

export type IconButtonProps = Omit<ComponentProps<'button'>, 'aria-label'> &
    VariantProps<typeof iconButton> & { 'aria-label': string };

export function IconButton({
    className,
    variant,
    size,
    type = 'button',
    ...props
}: IconButtonProps) {
    return (
        <button
            type={type}
            className={cn(iconButton({ variant, size }), className)}
            {...props}
        />
    );
}
