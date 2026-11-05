import type { ComponentProps } from 'react';

import { cn } from '@/lib/cn';

export function Skeleton({ className, ...props }: ComponentProps<'div'>) {
    return (
        <div
            aria-hidden
            className={cn('bg-surface-2 rounded-md motion-safe:animate-pulse', className)}
            {...props}
        />
    );
}
