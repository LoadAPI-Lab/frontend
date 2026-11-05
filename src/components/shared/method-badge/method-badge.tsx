import type { VariantProps } from 'class-variance-authority';
import { cva } from 'class-variance-authority';

import { cn } from '@/lib/cn';
import { methodColorClass } from '@/lib/http-method';

const badge = cva(
    'inline-flex items-center justify-center rounded-md bg-surface-2 font-mono font-semibold uppercase',
    {
        variants: {
            size: {
                sm: 'h-5 px-1.5 text-[10px]',
                md: 'h-6 px-2 text-xs',
                lg: 'size-12 text-sm',
            },
        },
        defaultVariants: { size: 'sm' },
    },
);

export interface MethodBadgeProps extends VariantProps<typeof badge> {
    method: string;
    className?: string;
}

export function MethodBadge({ method, size, className }: MethodBadgeProps) {
    return (
        <span className={cn(badge({ size }), methodColorClass(method), className)}>
            {method.toUpperCase()}
        </span>
    );
}
