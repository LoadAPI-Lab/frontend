import { QueryErrorResetBoundary } from '@tanstack/react-query';
import { Component, Suspense } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

import { ErrorState } from '@/components/shared/error-state';
import { Skeleton } from '@/components/ui/skeleton';

import { ApiError } from './fetcher';

export interface QueryBoundaryProps {
    children: ReactNode;
    /** Shown while suspense queries load. Defaults to three skeleton lines. */
    loading?: ReactNode;
    /** Accessible name for the loading region, e.g. "Loading collections". */
    loadingLabel?: string;
    size?: 'default' | 'compact';
}

/**
 * Wrap any subtree that uses `useSuspenseQuery`: shows `loading` while it loads and an
 * ErrorState with the request ID and a retry (which refetches the failed queries) if it fails.
 */
export function QueryBoundary({
    children,
    loading,
    loadingLabel,
    size = 'default',
}: QueryBoundaryProps) {
    return (
        <QueryErrorResetBoundary>
            {({ reset }) => (
                <ErrorBoundary
                    onReset={reset}
                    fallback={(error, retry) => (
                        <ErrorState
                            size={size}
                            message={error instanceof ApiError ? error.message : undefined}
                            requestId={error instanceof ApiError ? error.requestId : null}
                            onRetry={retry}
                        />
                    )}
                >
                    <Suspense
                        fallback={
                            <div
                                role="status"
                                aria-label={loadingLabel}
                                aria-busy
                            >
                                {loading ?? <DefaultLoading />}
                            </div>
                        }
                    >
                        {children}
                    </Suspense>
                </ErrorBoundary>
            )}
        </QueryErrorResetBoundary>
    );
}

function DefaultLoading() {
    return (
        <div className="flex flex-col gap-2 p-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
        </div>
    );
}

interface ErrorBoundaryProps {
    children: ReactNode;
    onReset: () => void;
    fallback: (error: unknown, retry: () => void) => ReactNode;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, { error: unknown }> {
    override state: { error: unknown } = { error: null };

    static getDerivedStateFromError(error: unknown) {
        return { error };
    }

    override componentDidCatch(error: unknown, info: ErrorInfo) {
        console.error('QueryBoundary caught', error, info.componentStack);
    }

    private readonly retry = () => {
        this.props.onReset();
        this.setState({ error: null });
    };

    override render() {
        return this.state.error === null
            ? this.props.children
            : this.props.fallback(this.state.error, this.retry);
    }
}
