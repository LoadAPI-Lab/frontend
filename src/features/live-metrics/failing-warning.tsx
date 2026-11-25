import { TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { FailureCause } from '@/api/live';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import { isKnownStatusCode } from '@/lib/http-status';

export interface FailingWarningProps {
    cause: FailureCause | null;
    stopping?: boolean;
    onStop: () => void;
    className?: string;
}

function useCauseMessage(cause: FailureCause | null) {
    const { t } = useTranslation();
    if (!cause) {
        return null;
    }
    const share = cause.all ? 'all' : 'most';
    if (cause.kind === 'network') {
        return t(`failingWarning.network.${share}`, {
            error: t(`liveMetrics.statusCodes.network.${cause.error}`),
        });
    }
    const status = isKnownStatusCode(cause.code)
        ? t('httpStatus.withReason', {
              code: cause.code,
              reason: t(`httpStatus.reasons.${cause.code}`),
          })
        : cause.code;
    return t(`failingWarning.status.${share}`, { status });
}

export function FailingWarning({
    cause,
    stopping = false,
    onStop,
    className,
}: FailingWarningProps) {
    const { t } = useTranslation();
    const message = useCauseMessage(cause);
    const [dismissed, setDismissed] = useState(false);
    const [announcement, setAnnouncement] = useState('');
    const visible = message !== null && !dismissed;
    if (visible && announcement === '') {
        setAnnouncement(`${t('failingWarning.title')} ${message} ${t('failingWarning.hint')}`);
    }

    return (
        <>
            <p
                aria-live="polite"
                className="sr-only"
            >
                {announcement}
            </p>
            {visible ? (
                <section
                    aria-label={t('failingWarning.label')}
                    className={cn(
                        'border-warning/35 bg-warning/10 flex items-center gap-3 rounded-lg border px-3 py-2',
                        className,
                    )}
                >
                    <TriangleAlert
                        aria-hidden
                        className="text-warning size-3.5 shrink-0"
                    />
                    <p className="text-fg min-w-0 flex-1 text-base">
                        <span className="text-warning font-bold">{t('failingWarning.title')}</span>{' '}
                        {message} {t('failingWarning.hint')}
                    </p>
                    <div className="flex shrink-0 items-center gap-2">
                        <Button
                            variant="danger"
                            size="sm"
                            disabled={stopping}
                            onClick={onStop}
                        >
                            {stopping ? t('failingWarning.stopping') : t('failingWarning.stop')}
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDismissed(true)}
                        >
                            {t('failingWarning.dismiss')}
                        </Button>
                    </div>
                </section>
            ) : null}
        </>
    );
}
