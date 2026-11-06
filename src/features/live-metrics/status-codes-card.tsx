import { useTranslation } from 'react-i18next';

import type { StatusBreakdown } from '@/api/live';
import { StatusDonut } from '@/components/shared/status-donut';
import { Card, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';

const GROUPS = [
    { key: '2xx', stroke: 'stroke-accent', swatch: 'bg-accent', always: true },
    { key: '3xx', stroke: 'stroke-fg-muted', swatch: 'bg-fg-muted', always: false },
    { key: '4xx', stroke: 'stroke-info', swatch: 'bg-info', always: true },
    { key: '5xx', stroke: 'stroke-danger', swatch: 'bg-danger', always: true },
    { key: 'network', stroke: 'stroke-warning', swatch: 'bg-warning', always: false },
] as const satisfies readonly {
    key: keyof StatusBreakdown;
    stroke: string;
    swatch: string;
    always: boolean;
}[];

export interface StatusCodesCardProps {
    statuses: StatusBreakdown;
    className?: string;
}

export function StatusCodesCard({ statuses, className }: StatusCodesCardProps) {
    const { t, i18n } = useTranslation();
    const total = GROUPS.reduce((sum, group) => sum + statuses[group.key], 0);
    const shown = GROUPS.filter((group) => group.always || statuses[group.key] > 0);

    return (
        <Card className={cn('flex items-center gap-4 px-4 py-3', className)}>
            <StatusDonut
                slices={GROUPS.map((group) => ({
                    key: group.key,
                    value: statuses[group.key],
                    strokeClassName: group.stroke,
                }))}
            />
            <div className="flex min-w-0 flex-1 flex-col gap-1.75">
                <CardTitle className="text-md font-bold">
                    {t('liveMetrics.statusCodes.title')}
                </CardTitle>
                <ul className="flex flex-wrap gap-x-4 gap-y-1">
                    {shown.map((group) => (
                        <li
                            key={group.key}
                            className="text-label flex items-center gap-1.5"
                        >
                            <span
                                aria-hidden
                                className={cn('size-1.75 rounded-xs', group.swatch)}
                            />
                            <span className="text-fg-muted">
                                {t(`liveMetrics.statusCodes.groups.${group.key}`)}
                            </span>
                            <span className="text-fg font-mono font-bold tabular-nums">
                                {total > 0
                                    ? `${formatNumber((statuses[group.key] / total) * 100, 1, i18n.language)}%`
                                    : '—'}
                            </span>
                        </li>
                    ))}
                </ul>
            </div>
        </Card>
    );
}
