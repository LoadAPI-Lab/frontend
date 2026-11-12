import { LoaderCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/cn';
import { methodColorClass } from '@/lib/http-method';

export interface ScratchRowProps {
    method: string;
    url: string;
    selected: boolean;
    running?: boolean;
    onOpen: () => void;
    className?: string;
}

export function ScratchRow({
    method,
    url,
    selected,
    running = false,
    onOpen,
    className,
}: ScratchRowProps) {
    const { t } = useTranslation();
    const shownUrl = url.trim() === '' ? t('collections.scratchRow.empty') : url;
    return (
        <button
            type="button"
            aria-current={selected ? 'page' : undefined}
            title={url || undefined}
            onClick={onOpen}
            className={cn(
                'focus-visible:ring-accent/40 flex w-full items-center gap-2 rounded-md border-l-2 px-2 py-1.5 text-left transition-colors outline-none focus-visible:ring-2',
                selected
                    ? 'bg-surface-selected border-accent'
                    : 'hover:bg-surface-input border-transparent',
                className,
            )}
        >
            <span
                className={cn(
                    'text-2xs w-9.5 shrink-0 font-mono font-extrabold',
                    methodColorClass(method),
                )}
            >
                {method}
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
                <span className={cn('text-base', selected ? 'text-fg' : 'text-fg-secondary')}>
                    {t('collections.scratchRow.title')}
                </span>
                <span className="text-fg-muted text-2xs truncate font-mono">{shownUrl}</span>
            </span>
            {running ? (
                <>
                    <LoaderCircle
                        aria-hidden
                        className="text-accent size-3 shrink-0 motion-safe:animate-spin"
                    />
                    <span className="sr-only">{t('collections.running')}</span>
                </>
            ) : null}
        </button>
    );
}
