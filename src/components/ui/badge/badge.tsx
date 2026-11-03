import type { VariantProps } from 'class-variance-authority';
import { cva } from 'class-variance-authority';
import type { ComponentProps } from 'react';

import { cn } from '@/lib/cn';

// Tier 1: static label, not interactive (use Chip for clickable ones).
// Figma: "p95 64ms" (solid), "5xx 3.1%" (danger), "raw · JSON" (outline), initials (neutral, accent-soft).
export const badgeVariants = cva(
    'inline-flex items-center gap-1 rounded-sm px-2.25 py-1.25 font-mono text-sm font-bold whitespace-nowrap tabular-nums leading-none',
    {
        variants: {
            variant: {
                solid: 'bg-accent text-accent-fg',
                'accent-soft': 'bg-accent/15 text-accent',
                danger: 'bg-danger/14 text-danger',
                info: 'bg-info/14 text-info',
                neutral: 'bg-surface-2 text-fg-badge',
                // Figma uses fg-subtle (3.4:1); fg-muted keeps this small text at AA contrast.
                outline: 'border border-border-strong font-normal text-fg-muted py-1',
            },
        },
        defaultVariants: { variant: 'neutral' },
    },
);

export type BadgeProps = ComponentProps<'span'> & VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, ...props }: BadgeProps) {
    return (
        <span
            className={cn(badgeVariants({ variant }), className)}
            {...props}
        />
    );
}
