import { Link } from '@tanstack/react-router';
import { Zap } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

const navLinkClass =
    'rounded-lg px-3 py-1.5 text-sm text-fg-muted transition-colors hover:text-fg data-[status=active]:bg-surface-2 data-[status=active]:text-fg';

export interface TopBarProps {
    /** right-hand slot: workers chip, account menu */
    actions?: ReactNode;
}

export function TopBar({ actions }: TopBarProps) {
    const { t } = useTranslation();
    return (
        <header className="border-border flex h-14 items-center gap-6 border-b px-4">
            <Link
                to="/"
                className="flex items-center gap-2 font-semibold"
            >
                <span className="bg-accent text-accent-fg flex size-7 items-center justify-center rounded-lg">
                    <Zap
                        aria-hidden
                        className="size-4"
                    />
                </span>
                {t('app.name')}
            </Link>
            <nav
                aria-label={t('nav.main')}
                className="flex items-center gap-1"
            >
                <Link
                    to="/tests"
                    className={navLinkClass}
                >
                    {t('nav.stressTests')}
                </Link>
                <Link
                    to="/scenarios"
                    className={navLinkClass}
                >
                    {t('nav.scenarios')}
                </Link>
                <Link
                    to="/history"
                    className={navLinkClass}
                >
                    {t('nav.history')}
                </Link>
            </nav>
            <div className="ml-auto flex items-center gap-3">{actions}</div>
        </header>
    );
}
