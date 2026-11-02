import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';

import { ApiError } from '@/api/fetcher';
import { AppShell } from '@/components/layout/app-shell';
import { UserAvatar } from '@/components/layout/user-avatar';
import { sessionQuery } from '@/features/auth';
import { CollectionsSidebar } from '@/features/collections';

// Pathless layout for every signed-in page: auth guard + shell.
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
        return (
            <AppShell
                sidebar={<CollectionsSidebar />}
                topBarActions={
                    <UserAvatar
                        name={session.name}
                        imageUrl={session.avatarUrl}
                    />
                }
            >
                <Outlet />
            </AppShell>
        );
    },
});
