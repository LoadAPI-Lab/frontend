import { useQuery } from '@tanstack/react-query';
import { CircleAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { ApiError } from '@/api/fetcher';
import { ErrorState } from '@/components/shared/error-state';
import { buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LogoMark } from '@/components/ui/icons';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/cn';

import { oauthErrorKey } from './oauth-errors';
import { savePostLoginRedirect } from './post-login-redirect';
import { oauthProvidersQuery, oauthStartUrl } from './providers';

export interface LoginPageProps {
    /** Same-app path to return to after signing in */
    redirect?: string;
    /** Error code core sent back from a failed sign-in */
    error?: string;
}

export function LoginPage({ redirect, error }: LoginPageProps) {
    const { t } = useTranslation();

    return (
        <main className="flex min-h-dvh items-center justify-center p-6">
            <Card className="w-full max-w-sm p-8">
                <div className="mb-6 flex flex-col items-center gap-3 text-center">
                    <span className="bg-accent text-accent-fg flex size-10 items-center justify-center rounded-lg">
                        <LogoMark
                            width="20"
                            height="20"
                        />
                    </span>
                    <h1 className="text-xl font-semibold tracking-tight">{t('auth.title')}</h1>
                    <p className="text-fg-muted text-base">{t('auth.subtitle')}</p>
                </div>
                {error ? (
                    <p
                        role="alert"
                        className="border-danger/40 bg-danger/10 text-danger mb-4 flex items-start gap-2 rounded-md border px-3 py-2 text-base"
                    >
                        <CircleAlert
                            aria-hidden
                            className="mt-0.5 size-3.5 shrink-0"
                        />
                        {t(oauthErrorKey(error))}
                    </p>
                ) : null}
                <ProviderList redirect={redirect} />
            </Card>
        </main>
    );
}

function ProviderList({ redirect }: { redirect?: string }) {
    const { t } = useTranslation();
    const providers = useQuery(oauthProvidersQuery);

    if (providers.isPending) {
        return (
            <output
                aria-label={t('auth.loadingProviders')}
                aria-busy
                className="flex flex-col gap-2"
            >
                <Skeleton className="h-9" />
                <Skeleton className="h-9" />
            </output>
        );
    }

    if (providers.isError) {
        return (
            <ErrorState
                size="compact"
                title={t('auth.providersFailed')}
                message={providers.error.message}
                requestId={
                    providers.error instanceof ApiError ? providers.error.requestId : undefined
                }
                onRetry={() => void providers.refetch()}
                retrying={providers.isRefetching}
            />
        );
    }

    if (providers.data.length === 0) {
        return <p className="text-fg-muted text-center text-base">{t('auth.noProviders')}</p>;
    }

    return (
        <div className="flex flex-col gap-2">
            {providers.data.map((provider) => (
                <a
                    key={provider.id}
                    href={oauthStartUrl(provider.id)}
                    onClick={() => savePostLoginRedirect(redirect)}
                    className={cn(buttonVariants({ variant: 'secondary', size: 'md' }), 'w-full')}
                >
                    {t('auth.continueWith', { provider: provider.name })}
                </a>
            ))}
        </div>
    );
}
