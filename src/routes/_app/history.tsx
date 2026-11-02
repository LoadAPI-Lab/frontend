import { createFileRoute } from '@tanstack/react-router';

import { HistoryPage } from '@/features/history';

export const Route = createFileRoute('/_app/history')({
    component: HistoryPage,
});
