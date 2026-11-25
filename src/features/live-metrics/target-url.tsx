import { Copy } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { MethodBadge } from '@/components/shared/method-badge';
import { IconButton } from '@/components/ui/icon-button';
import { toast } from '@/components/ui/toast';
import { Tooltip } from '@/components/ui/tooltip';
import { cn } from '@/lib/cn';

const TAIL_LENGTH = 24;

export interface TargetUrlProps {
    method: string;
    url: string;
    className?: string;
}

export function TargetUrl({ method, url, className }: TargetUrlProps) {
    const { t } = useTranslation();
    const cut = Math.max(0, url.length - TAIL_LENGTH);
    const head = url.slice(0, cut);
    const tail = url.slice(cut);
    const copy = () => {
        navigator.clipboard.writeText(url).then(
            () => toast.success({ title: t('liveMetrics.target.copied') }),
            () => toast.error({ title: t('liveMetrics.target.copyFailed') }),
        );
    };

    return (
        <div className={cn('flex min-w-0 items-center gap-2', className)}>
            <MethodBadge method={method} />
            <Tooltip.Root>
                <Tooltip.Trigger
                    render={<span />}
                    className="text-fg-secondary flex min-w-0 flex-1 font-mono text-sm"
                >
                    <span className="truncate">{head}</span>
                    <span className="shrink-0 whitespace-pre">{tail}</span>
                </Tooltip.Trigger>
                <Tooltip.Content className="max-w-120 font-mono break-all">{url}</Tooltip.Content>
            </Tooltip.Root>
            <IconButton
                variant="ghost"
                aria-label={t('liveMetrics.target.copy')}
                onClick={copy}
            >
                <Copy aria-hidden />
            </IconButton>
        </div>
    );
}
