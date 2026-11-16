import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { ApiError } from '@/api/fetcher';
import { testRunsRerun } from '@/api/generated/endpoints/test-runs/test-runs';
import type { StartTestRunResponseDto, TestRunResponseDto } from '@/api/generated/model';
import { toast } from '@/components/ui/toast';

import { shortRunId } from './history-format';

export function useRerun(onCreated: (created: StartTestRunResponseDto) => void) {
    const { t } = useTranslation();
    return useMutation({
        mutationFn: (id: string) =>
            testRunsRerun(id, { headers: { 'Idempotency-Key': crypto.randomUUID() } }),
        meta: { toastOnError: false },
        onSuccess: onCreated,
        onError: (error) => {
            toast.error({
                title: t('history.rerunFailed'),
                description:
                    error instanceof ApiError && error.code === 'TEST_RUN.CAPACITY_EXCEEDED'
                        ? t('testConfig.capacityExceeded')
                        : error.message,
            });
        },
    });
}

export function downloadRun(run: TestRunResponseDto) {
    const blob = new Blob([JSON.stringify(run, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `loadapi-run-${shortRunId(run.id)}.json`;
    link.click();
    URL.revokeObjectURL(url);
}
