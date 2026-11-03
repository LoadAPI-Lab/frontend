import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';

import { apiFetch } from '@/api/fetcher';

/**
 * Signs out on core, then drops every cached query and goes to login.
 * Navigates even if the request fails: the user asked to leave. FE-05 adds clearing the in-memory token.
 */
export function useSignOut() {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    return useMutation({
        mutationFn: () => apiFetch('/v1/auth/sign-out', { method: 'POST' }),
        onSettled: async () => {
            queryClient.clear();
            await navigate({ to: '/login' });
        },
    });
}
