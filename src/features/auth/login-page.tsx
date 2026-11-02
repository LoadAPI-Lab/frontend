import { Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { config } from '@/config';
import { cn } from '@/lib/cn';
import { safeRedirect } from '@/lib/safe-redirect';

export interface LoginPageProps {
    redirect?: string;
}

/** OAuth is done by core: these are full-page navigations, never fetch calls. */
export function oauthUrl(provider: 'google' | 'github', redirect?: string) {
    const params = new URLSearchParams({ redirect: safeRedirect(redirect, '/tests') });
    return `${config.apiBase}/v1/auth/${provider}?${params.toString()}`;
}

export function LoginPage({ redirect }: LoginPageProps) {
    const { t } = useTranslation();
    const providerLink = cn(buttonVariants({ variant: 'secondary' }), 'w-full');

    return (
        <main className="flex min-h-dvh items-center justify-center p-6">
            <Card className="w-full max-w-sm p-8">
                <div className="mb-6 flex flex-col items-center gap-3 text-center">
                    <span className="bg-accent text-accent-fg flex size-10 items-center justify-center rounded-xl">
                        <Zap
                            aria-hidden
                            className="size-5"
                        />
                    </span>
                    <h1 className="text-lg font-semibold">{t('auth.title')}</h1>
                    <p className="text-fg-muted text-sm">{t('auth.subtitle')}</p>
                </div>
                <div className="flex flex-col gap-2">
                    <a
                        href={oauthUrl('google', redirect)}
                        className={providerLink}
                    >
                        {t('auth.continueWithGoogle')}
                    </a>
                    <a
                        href={oauthUrl('github', redirect)}
                        className={providerLink}
                    >
                        {t('auth.continueWithGithub')}
                    </a>
                </div>
            </Card>
        </main>
    );
}
