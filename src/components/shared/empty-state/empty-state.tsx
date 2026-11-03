import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

export interface EmptyStateProps {
    /** Decorative icon (aria-hidden) */
    icon?: ReactNode;
    title: ReactNode;
    description?: ReactNode;
    /** Usually one Button or Chip */
    action?: ReactNode;
    /** `compact` for narrow places like the sidebar */
    size?: 'default' | 'compact';
    className?: string;
}

/** Tier 2: "nothing here yet" for a list, panel or page, with an optional next step. */
export function EmptyState({
    icon,
    title,
    description,
    action,
    size = 'default',
    className,
}: EmptyStateProps) {
    const compact = size === 'compact';
    return (
        <div
            className={cn(
                'flex flex-col items-center text-center',
                compact ? 'gap-2 px-3 py-6' : 'gap-3 px-6 py-12',
                className,
            )}
        >
            {icon ? (
                <span
                    aria-hidden
                    className={cn(
                        'bg-surface-2 text-fg-muted flex items-center justify-center rounded-lg [&_svg]:size-4',
                        compact ? 'size-8' : 'size-10 [&_svg]:size-5',
                    )}
                >
                    {icon}
                </span>
            ) : null}
            <div className="flex max-w-sm flex-col gap-1">
                <p className={cn('text-fg font-semibold', compact ? 'text-base' : 'text-lg')}>
                    {title}
                </p>
                {description ? <p className="text-fg-muted text-base">{description}</p> : null}
            </div>
            {action}
        </div>
    );
}
