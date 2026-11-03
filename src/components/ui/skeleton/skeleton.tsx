import type { ComponentProps } from 'react';

import { cn } from '@/lib/cn';

/** Tier 1: placeholder block while content loads. Decorative; the surrounding region announces loading. */
export function Skeleton({ className, ...props }: ComponentProps<'div'>) {
    return (
        <div
            aria-hidden
            className={cn('bg-surface-2 rounded-md motion-safe:animate-pulse', className)}
            {...props}
        />
    );
}
