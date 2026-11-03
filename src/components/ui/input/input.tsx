import { Input as BaseInput } from '@base-ui/react/input';

import { controlBase } from '@/components/ui/field/control-styles';
import { cn } from '@/lib/cn';

export type InputProps = BaseInput.Props;

/** Single-line text input. Put it inside `Field.Root` to get label, description and error wiring. */
export function Input({ className, ...props }: InputProps) {
    return (
        <BaseInput
            className={cn(controlBase, 'h-9 px-2.75', className)}
            {...props}
        />
    );
}
