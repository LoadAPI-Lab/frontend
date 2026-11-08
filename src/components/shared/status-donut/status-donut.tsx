import { cn } from '@/lib/cn';

export interface DonutSlice {
    key: string;
    value: number;
    strokeClassName: string;
}

export interface StatusDonutProps {
    slices: readonly DonutSlice[];
    size?: number;
    thickness?: number;
    className?: string;
}

const GAP = 2;
const MIN_ARC = 1.5;

export function StatusDonut({ slices, size = 52, thickness = 7, className }: StatusDonutProps) {
    const radius = (size - thickness) / 2;
    const circumference = 2 * Math.PI * radius;
    const visible = slices.filter((slice) => slice.value > 0);
    const total = visible.reduce((sum, slice) => sum + slice.value, 0);
    const gap = visible.length > 1 ? GAP : 0;
    const arcs = visible.map((slice, index) => {
        const start = visible
            .slice(0, index)
            .reduce((sum, previous) => sum + (previous.value / total) * circumference, 0);
        const length = (slice.value / total) * circumference;
        return { slice, start, arc: Math.max(length - gap, MIN_ARC) };
    });
    const center = size / 2;

    return (
        <svg
            aria-hidden
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            className={cn('shrink-0 -rotate-90', className)}
        >
            <circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                strokeWidth={thickness}
                className="stroke-track"
            />
            {arcs.map(({ slice, start, arc }) => (
                <circle
                    key={slice.key}
                    data-slice={slice.key}
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="none"
                    strokeWidth={thickness}
                    strokeDasharray={`${arc} ${circumference - arc}`}
                    strokeDashoffset={-start}
                    className={slice.strokeClassName}
                />
            ))}
        </svg>
    );
}
