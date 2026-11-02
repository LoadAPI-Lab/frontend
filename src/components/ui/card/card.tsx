import type { ComponentProps } from 'react';

import { cn } from '@/lib/cn';

export function Card({ className, ...props }: ComponentProps<'section'>) {
    return (
        <section
            className={cn('rounded-card border border-border bg-surface-1 p-4', className)}
            {...props}
        />
    );
}

export function CardTitle({ className, children, ...props }: ComponentProps<'h2'>) {
    return (
        <h2
            className={cn('text-sm font-semibold text-fg', className)}
            {...props}
        >
            {children}
        </h2>
    );
}

export function CardDescription({ className, ...props }: ComponentProps<'p'>) {
    return (
        <p
            className={cn('text-xs text-fg-muted', className)}
            {...props}
        />
    );
}
