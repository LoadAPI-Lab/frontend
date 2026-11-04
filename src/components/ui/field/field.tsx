import { Field as BaseField } from '@base-ui/react/field';

import { cn } from '@/lib/cn';

function Root({ className, ...props }: BaseField.Root.Props) {
    return (
        <BaseField.Root
            className={cn('flex flex-col gap-1.5', className)}
            {...props}
        />
    );
}

function Label({ className, ...props }: BaseField.Label.Props) {
    return (
        <BaseField.Label
            className={cn('text-label text-fg-muted font-medium', className)}
            {...props}
        />
    );
}

function Description({ className, ...props }: BaseField.Description.Props) {
    return (
        <BaseField.Description
            className={cn('text-sm text-fg-muted', className)}
            {...props}
        />
    );
}

function Error({ className, ...props }: BaseField.Error.Props) {
    return (
        <BaseField.Error
            className={cn('text-sm text-danger', className)}
            {...props}
        />
    );
}

export const Field = { Root, Label, Description, Error, Control: BaseField.Control };
