import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';

import { apiFetch } from '@/api/fetcher';

export function useSignOut() {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    return useMutation({
        mutationFn: () => apiFetch('/v1/auth/logout', { method: 'POST' }),
        meta: { toastOnError: false },
        onSettled: async () => {
            queryClient.clear();
            await navigate({ to: '/login' });
        },
    });
}
