import type { QueryClient } from '@tanstack/react-query';
import type { ErrorComponentProps } from '@tanstack/react-router';
import { createRootRouteWithContext, Link, Outlet } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { DesktopOnlyNotice } from '@/components/layout/desktop-only-notice';
import { Button, buttonVariants } from '@/components/ui/button';

export interface RouterContext {
    queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
    component: RootLayout,
    errorComponent: RootError,
    notFoundComponent: NotFound,
});

function RootLayout() {
    return (
        <>
            <DesktopOnlyNotice />
            <Outlet />
        </>
    );
}

function RootError({ reset }: ErrorComponentProps) {
    const { t } = useTranslation();
    return (
        <main className="flex min-h-dvh flex-col items-center justify-center gap-3 p-6 text-center">
            <h1 className="text-lg font-semibold">{t('app.errorTitle')}</h1>
            <p className="text-fg-muted max-w-md text-sm">{t('app.errorBody')}</p>
            <Button onClick={reset}>{t('app.retry')}</Button>
        </main>
    );
}

function NotFound() {
    const { t } = useTranslation();
    return (
        <main className="flex min-h-dvh flex-col items-center justify-center gap-3 p-6">
            <h1 className="text-lg font-semibold">{t('app.notFoundTitle')}</h1>
            <Link
                to="/tests"
                className={buttonVariants()}
            >
                {t('app.backHome')}
            </Link>
        </main>
    );
}
