import { TriangleAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Tooltip } from '@/components/ui/tooltip';
import { formatNumber } from '@/lib/format';

export interface LateBadgeProps {
    late: number;
    requests: number;
}

export function LateBadge({ late, requests }: LateBadgeProps) {
    const { t, i18n } = useTranslation();
    if (late <= 0) {
        return null;
    }
    const count = formatNumber(late, 0, i18n.language);
    const message = t('liveMetrics.late.message', {
        count: late,
        late: count,
        share: formatNumber(requests > 0 ? (late / requests) * 100 : 0, 1, i18n.language),
    });
    return (
        <Tooltip.Root>
            <Tooltip.Trigger
                type="button"
                className="border-warning/35 bg-warning/10 text-warning focus-visible:ring-warning/40 inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-xs font-medium outline-none focus-visible:ring-2"
            >
                <TriangleAlert
                    aria-hidden
                    className="size-3"
                />
                {t('liveMetrics.late.badge', { count: late, late: count })}
                <span className="sr-only">. {message}</span>
            </Tooltip.Trigger>
            <Tooltip.Content className="max-w-64">{message}</Tooltip.Content>
        </Tooltip.Root>
    );
}
