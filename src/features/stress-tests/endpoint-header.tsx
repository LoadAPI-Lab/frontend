import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/cn';
import { methodBackgroundClass } from '@/lib/http-method';

export interface EndpointHeaderProps {
    method: string;
    path: string;
    summary?: string;
    deprecated?: boolean;
    collection: string;
    servers: { url: string; description?: string }[];
    server: string;
    onServerChange: (url: string) => void;
    status?: ReactNode;
    className?: string;
}

export function EndpointHeader({
    method,
    path,
    summary,
    deprecated = false,
    collection,
    servers,
    server,
    onServerChange,
    status,
    className,
}: EndpointHeaderProps) {
    const { t } = useTranslation();
    return (
        <section
            aria-label={t('endpointHeader.label')}
            className={cn(
                'bg-surface-1 border-border flex items-center gap-3.5 rounded-card border px-4 py-3',
                className,
            )}
        >
            <span
                className={cn(
                    'text-accent-fg text-control flex size-11.5 shrink-0 items-center justify-center rounded-[10px] font-mono font-extrabold',
                    methodBackgroundClass(method),
                )}
            >
                {method}
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-0.75">
                <h2
                    className="text-fg flex min-w-0 items-center gap-2 font-mono text-xl font-bold"
                    title={summary}
                >
                    <span className="truncate">{path}</span>
                    {deprecated ? (
                        <>
                            {' '}
                            <Badge
                                variant="outline"
                                className="font-sans"
                            >
                                {t('endpointHeader.deprecated')}
                            </Badge>
                        </>
                    ) : null}
                </h2>
                <div className="text-fg-muted text-label flex min-w-0 items-center gap-1.5 font-mono">
                    <span className="shrink-0">{collection}</span>
                    <span aria-hidden>·</span>
                    {servers.length > 1 ? (
                        <Select.Root
                            items={servers.map((option) => ({
                                value: option.url,
                                label: option.url,
                            }))}
                            value={server}
                            onValueChange={(value) => {
                                if (typeof value === 'string') {
                                    onServerChange(value);
                                }
                            }}
                        >
                            <Select.Trigger
                                aria-label={t('endpointHeader.server')}
                                className="text-label h-6 w-auto max-w-sm min-w-0 border-transparent bg-transparent px-1.5 font-mono"
                            >
                                <Select.Value />
                            </Select.Trigger>
                            <Select.Popup>
                                {servers.map((option) => (
                                    <Select.Item
                                        key={option.url}
                                        value={option.url}
                                        className="font-mono text-base"
                                    >
                                        {option.description
                                            ? `${option.url} · ${option.description}`
                                            : option.url}
                                    </Select.Item>
                                ))}
                            </Select.Popup>
                        </Select.Root>
                    ) : servers.length === 1 ? (
                        <span className="truncate">{server}</span>
                    ) : (
                        <Input
                            aria-label={t('endpointHeader.server')}
                            value={server}
                            placeholder="https://api.example.com"
                            className="text-label h-6 max-w-sm px-1.5 font-mono"
                            onValueChange={(value) => onServerChange(value)}
                        />
                    )}
                </div>
            </div>
            {status}
        </section>
    );
}
