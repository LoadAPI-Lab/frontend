import { Toggle } from '@base-ui/react/toggle';
import { ListTree, Search, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { IconButton } from '@/components/ui/icon-button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/cn';

import { HISTORY_STATUSES, type HistoryStatus } from './history-api';

export interface HistoryToolbarProps {
    query: string | undefined;
    status: HistoryStatus | undefined;
    grouped: boolean;
    onQueryChange: (query: string) => void;
    onStatusChange: (status: HistoryStatus | null) => void;
    onGroupedChange: (grouped: boolean) => void;
    className?: string;
}

const STATUS_LABEL_KEY = {
    completed: 'runStatus.COMPLETED',
    stopped: 'runStatus.STOPPED',
    failed: 'runStatus.FAILED',
    running: 'runStatus.RUNNING',
} as const satisfies Record<HistoryStatus, string>;

function SearchBox({ query, onQueryChange }: Pick<HistoryToolbarProps, 'query' | 'onQueryChange'>) {
    const { t } = useTranslation();
    const [draft, setDraft] = useState(query ?? '');
    const [synced, setSynced] = useState(query);
    if (query !== synced) {
        setSynced(query);
        setDraft(query ?? '');
    }
    const change = (value: string) => {
        setDraft(value);
        onQueryChange(value);
    };

    return (
        <div className="relative">
            <Search
                aria-hidden
                className="text-fg-muted pointer-events-none absolute top-1/2 left-2.75 size-3.5 -translate-y-1/2"
            />
            <Input
                type="search"
                aria-label={t('history.search.label')}
                placeholder={t('history.search.placeholder')}
                value={draft}
                onChange={(event) => change(event.currentTarget.value)}
                onKeyDown={(event) => {
                    if (event.key === 'Escape' && draft) {
                        event.preventDefault();
                        change('');
                    }
                }}
                className="pr-9 pl-8 [&::-webkit-search-cancel-button]:hidden"
            />
            {draft ? (
                <IconButton
                    variant="ghost"
                    aria-label={t('history.search.clear')}
                    onClick={() => change('')}
                    className="absolute top-1/2 right-1.25 -translate-y-1/2"
                >
                    <X aria-hidden />
                </IconButton>
            ) : null}
        </div>
    );
}

export function HistoryToolbar({
    query,
    status,
    grouped,
    onQueryChange,
    onStatusChange,
    onGroupedChange,
    className,
}: HistoryToolbarProps) {
    const { t } = useTranslation();
    const items = [
        { value: null, label: t('history.statusFilter.all') },
        ...HISTORY_STATUSES.map((value) => ({ value, label: t(STATUS_LABEL_KEY[value]) })),
    ];

    return (
        <div className={cn('flex flex-col gap-2', className)}>
            <SearchBox
                query={query}
                onQueryChange={onQueryChange}
            />
            <div className="flex items-center gap-2">
                <Select.Root
                    items={items}
                    value={status ?? null}
                    onValueChange={(next) => onStatusChange(next)}
                >
                    <Select.Trigger
                        aria-label={t('history.statusFilter.label')}
                        className="min-w-0 flex-1"
                    >
                        <Select.Value className="data-placeholder:text-fg" />
                    </Select.Trigger>
                    <Select.Popup>
                        {items.map((item) => (
                            <Select.Item
                                key={item.value ?? 'all'}
                                value={item.value}
                            >
                                {item.label}
                            </Select.Item>
                        ))}
                    </Select.Popup>
                </Select.Root>
                <Toggle
                    pressed={grouped}
                    onPressedChange={onGroupedChange}
                    className={cn(
                        'border-border-strong bg-surface-input text-fg-muted text-md flex h-9 shrink-0 items-center gap-1.5 rounded-lg border px-2.75 transition-colors outline-none',
                        'hover:text-fg focus-visible:ring-accent/25 focus-visible:border-accent/60 focus-visible:ring-2',
                        'data-pressed:border-accent/40 data-pressed:bg-accent/8 data-pressed:text-fg',
                    )}
                >
                    <ListTree
                        aria-hidden
                        className="size-3.5"
                    />
                    {t('history.groupByEndpoint')}
                </Toggle>
            </div>
        </div>
    );
}
