import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

import { ScenariosPage } from '@/features/scenarios';

export const Route = createFileRoute('/_app/scenarios')({
    validateSearch: z.object({ scenario: z.string().optional() }),
    component: function ScenariosRoute() {
        const { scenario } = Route.useSearch();
        const navigate = Route.useNavigate();
        return (
            <ScenariosPage
                scenario={scenario}
                onOpen={(next) => void navigate({ search: next ? { scenario: next } : {} })}
            />
        );
    },
});
