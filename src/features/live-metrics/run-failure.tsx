import { CircleAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/cn';

export interface RunFailureProps {
    reason: string;
    className?: string;
}

export function RunFailure({ reason, className }: RunFailureProps) {
    const { t } = useTranslation();
    return (
        <p
            className={cn(
                'border-danger/35 bg-danger/10 text-danger flex items-center gap-2 rounded-lg border px-3 py-2 text-base',
                className,
            )}
        >
            <CircleAlert
                aria-hidden
                className="size-3.5 shrink-0"
            />
            <span>
                <span className="font-bold">{t('runOutcome.failed')}</span> {reason}
            </span>
        </p>
    );
}
