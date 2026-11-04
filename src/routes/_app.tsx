import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';

import { ApiError } from '@/api/fetcher';
import { AccountMenu } from '@/components/layout/account-menu';
import { AppShell } from '@/components/layout/app-shell';
import { sessionQuery, useSignOut } from '@/features/auth';
import { CollectionsSidebar } from '@/features/collections';

export const Route = createFileRoute('/_app')({
    beforeLoad: async ({ context, location }) => {
        try {
            const session = await context.queryClient.ensureQueryData(sessionQuery);
            return { session };
        } catch (error) {
            if (error instanceof ApiError && error.status === 401) {
                throw redirect({ to: '/login', search: { redirect: location.href } });
            }
            throw error;
        }
    },
    component: function AppLayout() {
        const { session } = Route.useRouteContext();
        const signOut = useSignOut();
        return (
            <AppShell
                sidebar={<CollectionsSidebar />}
                topBarActions={
                    <AccountMenu
                        user={session}
                        onSignOut={() => signOut.mutate()}
                        signingOut={signOut.isPending}
                    />
                }
            >
                <Outlet />
            </AppShell>
        );
    },
});
