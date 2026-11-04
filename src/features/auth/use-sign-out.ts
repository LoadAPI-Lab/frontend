import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';

import { apiFetch } from '@/api/fetcher';

/**
 * Core clears both session cookies, then we drop every cached query and go to login.
 * Navigates even if the request fails: the user asked to leave.
 */
export function useSignOut() {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    return useMutation({
        mutationFn: () => apiFetch('/v1/auth/logout', { method: 'POST' }),
        // leaving anyway, so no error toast
        meta: { toastOnError: false },
        onSettled: async () => {
            queryClient.clear();
            await navigate({ to: '/login' });
        },
    });
}
