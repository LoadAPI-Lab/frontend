import type { ComponentProps, ReactNode } from 'react';

import { cn } from '@/lib/cn';

export function StatList({ className, ...props }: ComponentProps<'dl'>) {
    return (
        <dl
            className={cn('grid gap-3', className)}
            {...props}
        />
    );
}

export interface StatCardProps extends Omit<ComponentProps<'div'>, 'children'> {
    label: string;
    value: string;
    unit?: string;
    tone?: 'default' | 'danger';
    badge?: ReactNode;
}

export function StatCard({
    label,
    value,
    unit,
    tone = 'default',
    badge,
    className,
    ...props
}: StatCardProps) {
    const danger = tone === 'danger';
    return (
        <div
            className={cn(
                'bg-surface-1 border-border flex min-w-0 flex-col-reverse gap-0.5 rounded-card border px-4 py-3',
                className,
            )}
            {...props}
        >
            <dt className="text-fg-muted text-label truncate">{label}</dt>
            <dd
                className={cn(
                    'flex min-w-0 items-center gap-2 font-mono text-2xl font-bold tabular-nums',
                    danger ? 'text-danger' : 'text-fg',
                )}
            >
                <span>
                    {value}
                    {unit ? (
                        <span
                            className={cn('text-control', danger ? 'text-danger' : 'text-fg-muted')}
                        >
                            {unit}
                        </span>
                    ) : null}
                </span>
                {badge ? (
                    <span className="ml-auto flex shrink-0 font-sans text-base font-normal">
                        {badge}
                    </span>
                ) : null}
            </dd>
        </div>
    );
}
