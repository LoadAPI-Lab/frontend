import { createFileRoute } from '@tanstack/react-router';

import { ScenariosPage } from '@/features/scenarios';

export const Route = createFileRoute('/_app/scenarios')({
    component: ScenariosPage,
});
