import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { Tooltip } from '@/components/ui/tooltip';
import { cn } from '@/lib/cn';

import { apiSpecsQuery } from './api';
import { specInitials } from './spec-tree';

export interface CollectionsRailProps {
    activeSpecId: string | null;
    onOpen: (specId: string) => void;
}

export function CollectionsRail({ activeSpecId, onOpen }: CollectionsRailProps) {
    const { t } = useTranslation();
    const specs = useQuery(apiSpecsQuery);
    const items = specs.data ?? [];
    if (items.length === 0) {
        return null;
    }

    return (
        <ul
            aria-label={t('collections.title')}
            className="flex flex-col items-center gap-2"
        >
            {items.map((spec) => {
                const active = spec.id === activeSpecId;
                return (
                    <li key={spec.id}>
                        <Tooltip.Root>
                            <Tooltip.Trigger
                                render={
                                    <button
                                        type="button"
                                        aria-label={t('collections.openSpec', { name: spec.name })}
                                        aria-current={active ? 'true' : undefined}
                                        onClick={() => onOpen(spec.id)}
                                        className={cn(
                                            'rounded-item focus-visible:ring-accent/40 flex size-8 items-center justify-center font-mono text-xs font-extrabold transition-colors outline-none focus-visible:ring-2',
                                            active
                                                ? 'bg-accent text-accent-fg'
                                                : 'bg-surface-2 text-fg-badge hover:text-fg hover:bg-surface-input',
                                        )}
                                    >
                                        {specInitials(spec.name)}
                                    </button>
                                }
                            />
                            <Tooltip.Content side="right">{spec.name}</Tooltip.Content>
                        </Tooltip.Root>
                    </li>
                );
            })}
        </ul>
    );
}
