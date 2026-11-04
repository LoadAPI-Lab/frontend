import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

export interface PageHeaderProps {
    title: ReactNode;
    description?: ReactNode;
    actions?: ReactNode;
    visuallyHidden?: boolean;
}

export function PageHeader({
    title,
    description,
    actions,
    visuallyHidden = false,
}: PageHeaderProps) {
    if (visuallyHidden) {
        return <h1 className="sr-only">{title}</h1>;
    }
    return (
        <div className={cn('flex items-start justify-between gap-4')}>
            <div>
                <h1 className="text-fg text-xl font-semibold tracking-tight">{title}</h1>
                {description ? <p className="text-fg-muted mt-1 text-base">{description}</p> : null}
            </div>
            {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </div>
    );
}
