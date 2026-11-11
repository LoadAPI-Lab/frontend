import { type ReactNode, useId } from 'react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/cn';
import { methodBackgroundClass } from '@/lib/http-method';

export interface EndpointHeaderProps {
    method: string;
    path: string;
    summary?: string;
    deprecated?: boolean;
    serverPlaceholder?: string;
    relativeServer?: string;
    server: string;
    onServerChange: (url: string) => void;
    serverLocked?: boolean;
    status?: ReactNode;
    className?: string;
}

export function EndpointHeader({
    method,
    path,
    summary,
    deprecated = false,
    serverPlaceholder,
    relativeServer,
    server,
    onServerChange,
    serverLocked = false,
    status,
    className,
}: EndpointHeaderProps) {
    const { t } = useTranslation();
    const hintId = useId();
    const relativeHint = relativeServer
        ? t('endpointHeader.relativeServer', { path: relativeServer })
        : undefined;
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
                    <Input
                        aria-label={t('endpointHeader.server')}
                        value={server}
                        disabled={serverLocked}
                        placeholder={
                            serverPlaceholder ?? `https://api.example.com${relativeServer ?? ''}`
                        }
                        title={relativeHint}
                        aria-describedby={relativeHint ? hintId : undefined}
                        spellCheck={false}
                        className="text-label h-6 w-80 max-w-full px-1.5 font-mono"
                        onValueChange={(value) => onServerChange(value)}
                    />
                    {relativeHint ? (
                        <span
                            id={hintId}
                            className="sr-only"
                        >
                            {relativeHint}
                        </span>
                    ) : null}
                </div>
            </div>
            {status}
        </section>
    );
}
