import type { QueryClient } from '@tanstack/react-query';
import type { ErrorComponentProps } from '@tanstack/react-router';
import { createRootRouteWithContext, Link, Outlet } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { ApiError } from '@/api/fetcher';
import { DesktopOnlyNotice } from '@/components/layout/desktop-only-notice';
import { StatusScreen } from '@/components/layout/status-screen';
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

function RootError({ error, reset }: ErrorComponentProps) {
    const { t } = useTranslation();
    return (
        <StatusScreen
            title={t('app.errorTitle')}
            body={t('app.errorBody')}
            requestId={error instanceof ApiError ? error.requestId : null}
            action={<Button onClick={reset}>{t('app.retry')}</Button>}
        />
    );
}

function NotFound() {
    const { t } = useTranslation();
    return (
        <StatusScreen
            title={t('app.notFoundTitle')}
            body={t('app.notFoundBody')}
            action={
                <Link
                    to="/tests"
                    className={buttonVariants()}
                >
                    {t('app.backHome')}
                </Link>
            }
        />
    );
}
