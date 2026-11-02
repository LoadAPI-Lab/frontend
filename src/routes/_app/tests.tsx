import { createFileRoute } from '@tanstack/react-router';

import { StressTestPage } from '@/features/stress-tests';

export const Route = createFileRoute('/_app/tests')({
    component: StressTestPage,
});
