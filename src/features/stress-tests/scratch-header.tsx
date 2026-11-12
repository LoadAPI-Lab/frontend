import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/cn';
import { HTTP_METHODS, type HttpMethod, isHttpMethod, methodColorClass } from '@/lib/http-method';

const methodItems = HTTP_METHODS.map((method) => ({ value: method, label: method }));

export interface ScratchHeaderProps {
    method: HttpMethod;
    onMethodChange: (method: HttpMethod) => void;
    url: string;
    onUrlChange: (url: string) => void;
    onClear: () => void;
    canClear: boolean;
    locked?: boolean;
    status?: ReactNode;
    className?: string;
}

export function ScratchHeader({
    method,
    onMethodChange,
    url,
    onUrlChange,
    onClear,
    canClear,
    locked = false,
    status,
    className,
}: ScratchHeaderProps) {
    const { t } = useTranslation();
    return (
        <section
            aria-label={t('stressTests.scratch.label')}
            className={cn(
                'bg-surface-1 border-border flex flex-col gap-2 rounded-card border px-4 py-3',
                className,
            )}
        >
            <h2 className="sr-only">{t('stressTests.scratch.label')}</h2>
            <div className="flex items-center gap-2">
                <Select.Root
                    items={methodItems}
                    value={method}
                    disabled={locked}
                    onValueChange={(next) => {
                        if (next && isHttpMethod(next)) {
                            onMethodChange(next);
                        }
                    }}
                >
                    <Select.Trigger
                        aria-label={t('stressTests.scratch.method')}
                        className="w-30 shrink-0"
                    >
                        <Select.Value
                            className={cn('font-mono font-extrabold', methodColorClass(method))}
                        />
                    </Select.Trigger>
                    <Select.Popup>
                        {methodItems.map((item) => (
                            <Select.Item
                                key={item.value}
                                value={item.value}
                                className={cn('font-mono font-bold', methodColorClass(item.value))}
                            >
                                {item.label}
                            </Select.Item>
                        ))}
                    </Select.Popup>
                </Select.Root>
                <Input
                    aria-label={t('stressTests.scratch.url')}
                    value={url}
                    disabled={locked}
                    placeholder={t('stressTests.scratch.urlPlaceholder')}
                    spellCheck={false}
                    autoComplete="off"
                    className="min-w-0 flex-1 font-mono"
                    onValueChange={(value) => onUrlChange(value)}
                />
                {status}
                <Button
                    variant="ghost"
                    size="sm"
                    disabled={locked || !canClear}
                    onClick={onClear}
                >
                    {t('stressTests.scratch.clear')}
                </Button>
            </div>
            <p className="text-fg-muted text-label">{t('stressTests.scratch.note')}</p>
        </section>
    );
}
