import { Field as BaseField } from '@base-ui/react/field';
import type { ComponentProps } from 'react';

import { controlBase } from '@/components/ui/field/control-styles';
import { cn } from '@/lib/cn';

export interface TextareaProps extends Omit<ComponentProps<'textarea'>, 'className'> {
    className?: string;
    /** Use the monospace font, e.g. for pasting an OpenAPI doc. */
    mono?: boolean;
}

/** Multi-line text input. Registers with a surrounding `Field.Root` like `Input` does. */
export function Textarea({ className, mono = false, rows = 6, ...props }: TextareaProps) {
    return (
        <BaseField.Control
            render={
                <textarea
                    rows={rows}
                    {...props}
                />
            }
            className={cn(
                controlBase,
                'min-h-20 resize-y px-2.75 py-2',
                mono && 'font-mono text-base',
                className,
            )}
        />
    );
}
