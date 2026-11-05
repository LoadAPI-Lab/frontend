import type { ComponentProps } from 'react';

import { cn } from '@/lib/cn';

export type ChipProps = Omit<ComponentProps<'button'>, 'type'>;

export function Chip({ className, ...props }: ChipProps) {
    return (
        <button
            type="button"
            className={cn(
                'text-label text-accent bg-accent/8 border-accent/22 inline-flex items-center rounded-md border px-2.25 py-1.25 font-mono leading-none whitespace-nowrap transition-colors',
                'hover:bg-accent/14 focus-visible:ring-2 focus-visible:ring-accent/40 outline-none disabled:pointer-events-none disabled:opacity-50',
                className,
            )}
            {...props}
        />
    );
}
