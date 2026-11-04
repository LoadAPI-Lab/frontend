import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

import { LoginPage } from '@/features/auth';

export const Route = createFileRoute('/login')({
    validateSearch: z.object({
        redirect: z.string().optional(),
        error: z.string().optional(),
    }),
    component: function LoginRoute() {
        const { redirect, error } = Route.useSearch();
        return (
            <LoginPage
                redirect={redirect}
                error={error}
            />
        );
    },
});
