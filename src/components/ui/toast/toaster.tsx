import { Toast } from '@base-ui/react/toast';
import { CircleAlert, CircleCheck, Info, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/cn';

import { toastManager } from './toast-manager';

const icons = { success: CircleCheck, error: CircleAlert, info: Info } as const;
const iconColor = { success: 'text-accent', error: 'text-danger', info: 'text-info' } as const;

function isKind(type: string | undefined): type is keyof typeof icons {
    return type === 'success' || type === 'error' || type === 'info';
}

function ToastList() {
    const { t } = useTranslation();
    const { toasts } = Toast.useToastManager();
    return toasts.map((item) => {
        const kind = isKind(item.type) ? item.type : 'info';
        const Icon = icons[kind];
        return (
            <Toast.Root
                key={item.id}
                toast={item}
                className={cn(
                    'border-border-strong bg-surface-raised flex w-90 items-start gap-2.5 rounded-lg border p-3 shadow-xl shadow-black/40',
                    'transition-[opacity,transform] duration-200 data-ending-style:translate-y-2 data-ending-style:opacity-0 data-starting-style:translate-y-2 data-starting-style:opacity-0',
                )}
            >
                <Icon
                    aria-hidden
                    className={cn('mt-0.5 size-4 shrink-0', iconColor[kind])}
                />
                <div className="min-w-0 flex-1">
                    <Toast.Title className="text-md text-fg font-semibold" />
                    <Toast.Description className="text-fg-muted mt-0.5 text-base break-words" />
                </div>
                <Toast.Close
                    aria-label={t('toast.dismiss')}
                    className="text-fg-muted hover:text-fg hover:bg-surface-2 focus-visible:ring-accent/40 -mt-0.5 -mr-0.5 rounded-md p-1 outline-none focus-visible:ring-2"
                >
                    <X
                        aria-hidden
                        className="size-3.5"
                    />
                </Toast.Close>
            </Toast.Root>
        );
    });
}

/** Mount once at the app root. Show toasts with `toast.success/error/info()` from './toast-manager'. */
export function Toaster() {
    return (
        <Toast.Provider
            toastManager={toastManager}
            limit={3}
        >
            <Toast.Portal>
                <Toast.Viewport className="fixed right-5 bottom-5 z-50 flex flex-col gap-2 outline-none">
                    <ToastList />
                </Toast.Viewport>
            </Toast.Portal>
        </Toast.Provider>
    );
}
