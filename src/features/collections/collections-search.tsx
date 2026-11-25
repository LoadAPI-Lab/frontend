import { Search, X } from 'lucide-react';
import type { Ref } from 'react';
import { useTranslation } from 'react-i18next';

import { IconButton } from '@/components/ui/icon-button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/cn';

export interface CollectionsSearchProps {
    value: string;
    onChange: (value: string) => void;
    ref?: Ref<HTMLInputElement>;
    className?: string;
}

export function CollectionsSearch({ value, onChange, ref, className }: CollectionsSearchProps) {
    const { t } = useTranslation();
    return (
        <search className={cn('relative flex items-center', className)}>
            <Search
                aria-hidden
                className="text-fg-muted pointer-events-none absolute left-2.5 size-3.5"
            />
            <Input
                ref={ref}
                type="search"
                value={value}
                onChange={(event) => onChange(event.currentTarget.value)}
                onKeyDown={(event) => {
                    if (event.key !== 'Escape') {
                        return;
                    }
                    event.preventDefault();
                    if (value) {
                        onChange('');
                    } else {
                        event.currentTarget.blur();
                    }
                }}
                aria-label={t('collections.search.label')}
                aria-keyshortcuts="/"
                placeholder={t('collections.search.placeholder')}
                autoComplete="off"
                spellCheck={false}
                className="h-8 pr-8 pl-8 text-base [&::-webkit-search-cancel-button]:appearance-none"
            />
            {value ? (
                <IconButton
                    variant="ghost"
                    aria-label={t('collections.search.clear')}
                    onClick={() => onChange('')}
                    className="absolute right-1"
                >
                    <X aria-hidden />
                </IconButton>
            ) : (
                <kbd
                    aria-hidden
                    className="border-border-strong text-fg-muted pointer-events-none absolute right-2 rounded-xs border px-1.5 font-mono text-xs"
                >
                    /
                </kbd>
            )}
        </search>
    );
}
