import { Monitor } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function DesktopOnlyNotice() {
    const { t } = useTranslation();
    return (
        <div
            role="alert"
            className="bg-bg max-desktop:flex fixed inset-0 z-50 hidden flex-col items-center justify-center gap-3 p-8 text-center"
        >
            <Monitor
                aria-hidden
                className="text-accent size-8"
            />
            <h1 className="text-lg font-semibold">{t('desktopOnly.title')}</h1>
            <p className="text-fg-muted max-w-sm text-sm">{t('desktopOnly.body')}</p>
        </div>
    );
}
