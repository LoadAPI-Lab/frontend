import { useTranslation } from 'react-i18next';

import { NETWORK_ERRORS, type NetworkError } from '@/api/live';
import { Card, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';

const CLASS_SWATCHES: Record<string, string> = {
    '2': 'bg-accent',
    '3': 'bg-fg-muted',
    '4': 'bg-info',
    '5': 'bg-danger',
};

interface Row {
    key: string;
    label: string;
    count: number;
    swatch: string;
    mono: boolean;
}

export interface StatusCodesCardProps {
    codes: Record<string, number>;
    networkErrors?: Record<NetworkError, number>;
    className?: string;
}

export function StatusCodesCard({ codes, networkErrors, className }: StatusCodesCardProps) {
    const { t, i18n } = useTranslation();
    const format = (value: number, digits = 0) => formatNumber(value, digits, i18n.language);

    const rows: Row[] = [
        ...Object.entries(codes)
            .filter(([, count]) => count > 0)
            .toSorted(([first], [second]) => first.localeCompare(second))
            .map(([code, count]) => ({
                key: code,
                label: code,
                count,
                swatch: CLASS_SWATCHES[code.charAt(0)] ?? 'bg-fg-muted',
                mono: true,
            })),
        ...NETWORK_ERRORS.filter((kind) => (networkErrors?.[kind] ?? 0) > 0).map((kind) => ({
            key: kind,
            label: t(`liveMetrics.statusCodes.network.${kind}`),
            count: networkErrors?.[kind] ?? 0,
            swatch: 'bg-warning',
            mono: false,
        })),
    ];
    const total = rows.reduce((sum, row) => sum + row.count, 0);

    return (
        <Card className={cn('flex flex-col gap-2 px-4 py-3', className)}>
            <CardTitle className="text-md font-bold">
                {t('liveMetrics.statusCodes.title')}
            </CardTitle>
            {rows.length === 0 ? (
                <p className="text-fg-muted text-sm">{t('liveMetrics.statusCodes.empty')}</p>
            ) : (
                <table className="text-label w-full tabular-nums">
                    <thead className="sr-only">
                        <tr>
                            <th scope="col">{t('liveMetrics.statusCodes.columns.response')}</th>
                            <th scope="col">{t('liveMetrics.statusCodes.columns.count')}</th>
                            <th scope="col">{t('liveMetrics.statusCodes.columns.share')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => (
                            <tr
                                key={row.key}
                                className="border-border border-t first:border-t-0"
                            >
                                <th
                                    scope="row"
                                    aria-label={row.label}
                                    className="py-1 text-left font-normal"
                                >
                                    <span className="flex items-center gap-2">
                                        <span
                                            aria-hidden
                                            className={cn(
                                                'size-2 shrink-0 rounded-[2px]',
                                                row.swatch,
                                            )}
                                        />
                                        <span
                                            className={cn(
                                                'text-fg',
                                                row.mono && 'font-mono font-bold',
                                            )}
                                        >
                                            {row.label}
                                        </span>
                                    </span>
                                </th>
                                <td className="text-fg-muted py-1 text-right font-mono">
                                    {format(row.count)}
                                </td>
                                <td className="text-fg w-16 py-1 text-right font-mono font-bold">
                                    {`${format((row.count / total) * 100, 1)}%`}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </Card>
    );
}
