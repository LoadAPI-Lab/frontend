import { CircleAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';

export interface ErrorStateProps {
    /** Defaults to "Couldn't load this" */
    title?: ReactNode;
    /** Usually the error message from core */
    message?: ReactNode;
    /** Core's x-request-id, shown so support can find the request in the logs */
    requestId?: string | null;
    onRetry?: () => void;
    retrying?: boolean;
    size?: 'default' | 'compact';
    className?: string;
}

/** Tier 2: a section that failed to load, with retry. For whole pages use layout/StatusScreen. */
export function ErrorState({
    title,
    message,
    requestId,
    onRetry,
    retrying = false,
    size = 'default',
    className,
}: ErrorStateProps) {
    const { t } = useTranslation();
    const compact = size === 'compact';
    return (
        <div
            role="alert"
            className={cn(
                'flex flex-col items-center text-center',
                compact ? 'gap-2 px-3 py-6' : 'gap-3 px-6 py-12',
                className,
            )}
        >
            <span
                aria-hidden
                className="bg-danger/14 text-danger flex size-8 items-center justify-center rounded-lg"
            >
                <CircleAlert className="size-4" />
            </span>
            <div className="flex max-w-sm flex-col gap-1">
                <p className={cn('text-fg font-semibold', compact ? 'text-base' : 'text-lg')}>
                    {title ?? t('errors.loadTitle')}
                </p>
                {message ? <p className="text-fg-muted text-base break-words">{message}</p> : null}
                {requestId ? (
                    <p className="text-fg-muted font-mono text-sm">
                        {t('errors.requestId', { id: requestId })}
                    </p>
                ) : null}
            </div>
            {onRetry ? (
                <Button
                    size="sm"
                    onClick={onRetry}
                    disabled={retrying}
                >
                    {t('errors.retry')}
                </Button>
            ) : null}
        </div>
    );
}
