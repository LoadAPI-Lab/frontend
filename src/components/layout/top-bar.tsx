import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { LogoMark } from '@/components/ui/icons';

const navLink =
    'text-md flex h-8.5 items-center rounded-lg border border-transparent px-3.5 font-medium text-fg-muted transition-colors outline-none ' +
    'hover:text-fg focus-visible:ring-2 focus-visible:ring-accent/40 ' +
    'data-[status=active]:border-border-strong data-[status=active]:bg-surface-raised data-[status=active]:font-semibold data-[status=active]:text-fg';

export interface TopBarProps {
    actions?: ReactNode;
}

export function TopBar({ actions }: TopBarProps) {
    const { t } = useTranslation();
    return (
        <header className="border-border-subtle flex h-14 shrink-0 items-center gap-6.5 border-b px-5">
            <Link
                to="/"
                className="focus-visible:ring-accent/40 flex items-center gap-2.25 rounded-md outline-none focus-visible:ring-2"
            >
                <span className="bg-accent text-accent-fg flex size-6 items-center justify-center rounded-md">
                    <LogoMark />
                </span>
                <span className="text-fg text-lg font-bold tracking-tight">{t('app.name')}</span>
            </Link>
            <nav
                aria-label={t('nav.main')}
                className="flex items-center gap-1"
            >
                <Link
                    to="/tests"
                    className={navLink}
                >
                    {t('nav.stressTests')}
                </Link>
                <Link
                    to="/scenarios"
                    className={navLink}
                >
                    {t('nav.scenarios')}
                </Link>
                <Link
                    to="/history"
                    className={navLink}
                >
                    {t('nav.history')}
                </Link>
            </nav>
            <div className="ml-auto flex items-center gap-3">{actions}</div>
        </header>
    );
}
