import { TriangleAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';

export interface LateWarningProps {
    late: number;
    requests: number;
    className?: string;
}

export function LateWarning({ late, requests, className }: LateWarningProps) {
    const { t, i18n } = useTranslation();
    if (late <= 0) {
        return null;
    }
    return (
        <p
            className={cn(
                'border-warning/35 bg-warning/10 text-warning flex items-center gap-2 rounded-lg border px-3 py-2 text-base',
                className,
            )}
        >
            <TriangleAlert
                aria-hidden
                className="size-3.5 shrink-0"
            />
            <span>
                {t('liveMetrics.late.message', {
                    count: late,
                    late: formatNumber(late, 0, i18n.language),
                    share: formatNumber(
                        requests > 0 ? (late / requests) * 100 : 0,
                        1,
                        i18n.language,
                    ),
                })}
            </span>
        </p>
    );
}
