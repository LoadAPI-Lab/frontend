import { X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { PlusIcon } from '@/components/ui/icons';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/cn';
import { type KeyValueRow, newRow } from '@/lib/request-draft';

export interface KeyValueEditorProps {
    rows: KeyValueRow[];
    onChange: (rows: KeyValueRow[]) => void;
    keyLabel: string;
    valueLabel: string;
    addLabel: string;
    removeLabel: (index: number) => string;
    keyPlaceholder?: string;
    valuePlaceholder?: string;
    className?: string;
}

export function KeyValueEditor({
    rows,
    onChange,
    keyLabel,
    valueLabel,
    addLabel,
    removeLabel,
    keyPlaceholder,
    valuePlaceholder,
    className,
}: KeyValueEditorProps) {
    const update = (id: string, change: Partial<KeyValueRow>) =>
        onChange(rows.map((row) => (row.id === id ? { ...row, ...change } : row)));

    return (
        <div className={cn('flex flex-col gap-2', className)}>
            {rows.length > 0 ? (
                <ul className="flex flex-col gap-1.5">
                    {rows.map((row, index) => (
                        <li
                            key={row.id}
                            className="flex items-center gap-1.5"
                        >
                            <Input
                                aria-label={`${keyLabel} ${index + 1}`}
                                value={row.key}
                                placeholder={keyPlaceholder}
                                spellCheck={false}
                                className="w-2/5 font-mono"
                                onValueChange={(key) => update(row.id, { key })}
                            />
                            <Input
                                aria-label={`${valueLabel} ${index + 1}`}
                                value={row.value}
                                placeholder={valuePlaceholder}
                                spellCheck={false}
                                className="flex-1 font-mono"
                                onValueChange={(value) => update(row.id, { value })}
                            />
                            <IconButton
                                variant="ghost"
                                size="md"
                                aria-label={removeLabel(index + 1)}
                                onClick={() =>
                                    onChange(rows.filter((other) => other.id !== row.id))
                                }
                            >
                                <X aria-hidden />
                            </IconButton>
                        </li>
                    ))}
                </ul>
            ) : null}
            <Button
                variant="ghost"
                size="sm"
                className="self-start"
                onClick={() => onChange([...rows, newRow()])}
            >
                <PlusIcon aria-hidden />
                {addLabel}
            </Button>
        </div>
    );
}
