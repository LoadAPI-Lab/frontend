import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';

import { authLogout } from '@/api/generated/endpoints/auth/auth';

export function useSignOut() {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    return useMutation({
        mutationFn: () => authLogout(),
        meta: { toastOnError: false },
        onSettled: async () => {
            queryClient.clear();
            await navigate({ to: '/login' });
        },
    });
}
