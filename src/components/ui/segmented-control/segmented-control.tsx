import { Toggle } from '@base-ui/react/toggle';
import { ToggleGroup } from '@base-ui/react/toggle-group';
import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

// Tier 1: the "Single / Batch / Round-robin" switch (Figma node 5:503).
// Base UI ToggleGroup in single mode; Root takes a plain string value and never lets the
// user press the active item off, so exactly one item is always selected.

export interface SegmentedControlRootProps<Value extends string> {
    value: Value;
    onValueChange: (value: Value) => void;
    /** Accessible name of the group, e.g. "Test mode". */
    'aria-label': string;
    disabled?: boolean;
    className?: string;
    children: ReactNode;
}

function Root<Value extends string>({
    value,
    onValueChange,
    className,
    children,
    ...props
}: SegmentedControlRootProps<Value>) {
    return (
        <ToggleGroup<Value>
            value={[value]}
            onValueChange={(next) => {
                const [picked] = next;
                if (picked !== undefined) {
                    onValueChange(picked);
                }
            }}
            className={cn(
                'bg-surface-code border-track inline-flex rounded-editor border p-0.75',
                className,
            )}
            {...props}
        >
            {children}
        </ToggleGroup>
    );
}

export interface SegmentedControlItemProps<Value extends string> {
    value: Value;
    disabled?: boolean;
    className?: string;
    children: ReactNode;
}

function Item<Value extends string>({
    value,
    className,
    children,
    ...props
}: SegmentedControlItemProps<Value>) {
    return (
        <Toggle<Value>
            value={value}
            className={cn(
                'group text-control text-fg-muted flex h-7.5 items-center gap-1.75 rounded-md px-3.25 font-medium transition-colors outline-none',
                'hover:text-fg focus-visible:ring-2 focus-visible:ring-accent/40 disabled:opacity-50',
                'data-pressed:bg-surface-2 data-pressed:text-fg data-pressed:font-semibold',
                className,
            )}
            {...props}
        >
            <span
                aria-hidden
                className="bg-fg-disabled group-data-pressed:bg-accent size-1.5 rounded-xs"
            />
            {children}
        </Toggle>
    );
}

export const SegmentedControl = { Root, Item };
