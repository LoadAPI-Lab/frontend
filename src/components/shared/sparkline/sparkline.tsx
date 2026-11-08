import { cn } from '@/lib/cn';

export interface SparklineProps {
    values: readonly (number | null | undefined)[];
    width?: number;
    height?: number;
    className?: string;
}

const STROKE = 1.25;

export function sparklinePoints(
    values: readonly (number | null | undefined)[],
    width: number,
    height: number,
): string {
    const known = values.filter((value): value is number => typeof value === 'number');
    if (known.length < 2) {
        return '';
    }
    const max = Math.max(...known, 1);
    const step = width / (values.length - 1);
    const usable = height - STROKE * 2;
    return values
        .map((value, index) =>
            typeof value === 'number'
                ? `${(index * step).toFixed(1)},${(STROKE + usable - (value / max) * usable).toFixed(1)}`
                : null,
        )
        .filter((point) => point !== null)
        .join(' ');
}

export function Sparkline({ values, width = 96, height = 20, className }: SparklineProps) {
    const points = sparklinePoints(values, width, height);
    return (
        <svg
            aria-hidden
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            className={cn('shrink-0 overflow-visible', className)}
        >
            {points ? (
                <polyline
                    points={points}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={STROKE}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                />
            ) : (
                <line
                    x1={0}
                    x2={width}
                    y1={height - STROKE}
                    y2={height - STROKE}
                    stroke="currentColor"
                    strokeOpacity={0.3}
                    strokeWidth={STROKE}
                />
            )}
        </svg>
    );
}
