import { QueryErrorResetBoundary } from '@tanstack/react-query';
import { Component, Suspense } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

import { ErrorState } from '@/components/shared/error-state';
import { Skeleton } from '@/components/ui/skeleton';

import { ApiError } from './fetcher';

export interface QueryBoundaryProps {
    children: ReactNode;
    loading?: ReactNode;
    loadingLabel?: string;
    size?: 'default' | 'compact';
}

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
                    size={size}
                >
                    <Suspense
                        fallback={
                            <output
                                aria-label={loadingLabel}
                                aria-busy
                                className="block"
                            >
                                {loading ?? <DefaultLoading />}
                            </output>
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

function QueryErrorFallback({
    error,
    onRetry,
    size,
}: {
    error: unknown;
    onRetry: () => void;
    size: QueryBoundaryProps['size'];
}) {
    return (
        <ErrorState
            size={size}
            message={error instanceof ApiError ? error.message : undefined}
            requestId={error instanceof ApiError ? error.requestId : null}
            onRetry={onRetry}
        />
    );
}

interface ErrorBoundaryProps {
    children: ReactNode;
    onReset: () => void;
    size: QueryBoundaryProps['size'];
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
        return this.state.error === null ? (
            this.props.children
        ) : (
            <QueryErrorFallback
                error={this.state.error}
                onRetry={this.retry}
                size={this.props.size}
            />
        );
    }
}
