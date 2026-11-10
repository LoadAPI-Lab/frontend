import { Ellipsis, FileUp, Pencil, Trash2 } from 'lucide-react';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { Menu } from '@/components/ui/menu';

export type SpecAction = 'rename' | 'reimport' | 'delete';

export interface SpecActionsProps {
    name: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onAction: (action: SpecAction) => void;
    deleteBlocked?: boolean;
}

export function SpecActions({
    name,
    open,
    onOpenChange,
    onAction,
    deleteBlocked = false,
}: SpecActionsProps) {
    const { t } = useTranslation();
    const triggerRef = useRef<HTMLButtonElement>(null);
    const chosen = useRef<SpecAction | null>(null);
    const choose = (action: SpecAction) => {
        chosen.current = action;
    };

    return (
        <Menu.Root
            open={open}
            onOpenChange={onOpenChange}
            onOpenChangeComplete={(isOpen) => {
                const action = chosen.current;
                chosen.current = null;
                if (!isOpen && action) {
                    onAction(action);
                }
            }}
        >
            <Menu.Trigger
                ref={triggerRef}
                tabIndex={-1}
                aria-label={t('collections.actions.label', { name })}
                className="text-fg-muted hover:text-fg hover:bg-surface-2 data-popup-open:bg-surface-2 data-popup-open:text-fg flex size-5.5 shrink-0 items-center justify-center rounded-sm opacity-0 transition-opacity outline-none group-hover/tree-row:opacity-100 group-focus-visible/tree-row:opacity-100 data-popup-open:opacity-100"
            >
                <Ellipsis
                    aria-hidden
                    className="size-3.5"
                />
            </Menu.Trigger>
            <Menu.Popup
                align="start"
                finalFocus={() =>
                    triggerRef.current?.closest<HTMLElement>('[role="treeitem"]') ?? true
                }
            >
                <Menu.Item onClick={() => choose('rename')}>
                    <Pencil aria-hidden />
                    {t('collections.actions.rename')}
                </Menu.Item>
                <Menu.Item onClick={() => choose('reimport')}>
                    <FileUp aria-hidden />
                    {t('collections.actions.reimport')}
                </Menu.Item>
                <Menu.Separator />
                <Menu.Item
                    onClick={() => choose('delete')}
                    disabled={deleteBlocked}
                    className="text-danger [&_svg]:text-danger"
                >
                    <Trash2 aria-hidden />
                    {deleteBlocked
                        ? t('collections.actions.deleteBlocked')
                        : t('collections.actions.delete')}
                </Menu.Item>
            </Menu.Popup>
        </Menu.Root>
    );
}
