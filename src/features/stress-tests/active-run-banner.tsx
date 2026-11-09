import { Link } from '@tanstack/react-router';
import { CircleDot } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useTestRunsStop } from '@/api/generated/endpoints/test-runs/test-runs';
import { useActiveRun } from '@/api/live';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';

export interface ActiveRunBannerProps {
    currentRunId: string | undefined;
    className?: string;
}

export function ActiveRunBanner({ currentRunId, className }: ActiveRunBannerProps) {
    const { t } = useTranslation();
    const { active, refetch } = useActiveRun();
    const stop = useTestRunsStop({
        mutation: { onSuccess: () => void refetch() },
    });
    if (!active || active.id === currentRunId) {
        return null;
    }
    const { place } = active;

    return (
        <div
            className={cn(
                'border-info/35 bg-info/10 text-fg flex items-center gap-3 rounded-lg border px-3 py-2 text-base',
                className,
            )}
        >
            <CircleDot
                aria-hidden
                className="text-info size-3.5 shrink-0"
            />
            <p className="min-w-0 flex-1">{t('activeRun.message')}</p>
            <Link
                to="/tests"
                search={place ? { ...place, run: active.id } : { run: active.id }}
                className="text-info focus-visible:ring-accent/40 rounded-sm font-medium underline-offset-2 outline-none hover:underline focus-visible:ring-2"
            >
                {t('activeRun.view')}
            </Link>
            <Button
                variant="danger"
                size="sm"
                disabled={stop.isPending}
                onClick={() => stop.mutate({ id: active.id })}
            >
                {stop.isPending ? t('testConfig.stopping') : t('activeRun.stop')}
            </Button>
        </div>
    );
}
