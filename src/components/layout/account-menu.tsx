import { LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Menu } from '@/components/ui/menu';

import { UserAvatar } from './user-avatar';

export interface AccountMenuProps {
    user: { name: string; email: string; avatarUrl?: string | null };
    onSignOut: () => void;
    signingOut?: boolean;
}

/** Avatar button in the top bar that opens the account menu. Presentational: the route passes the user and the action. */
export function AccountMenu({ user, onSignOut, signingOut = false }: AccountMenuProps) {
    const { t } = useTranslation();
    return (
        <Menu.Root>
            {/* The visible initials stay in the accessible name ("MK, account menu for …") so voice-control users can say what they see. */}
            <Menu.Trigger className="rounded-item focus-visible:ring-accent/40 outline-none focus-visible:ring-2">
                <UserAvatar
                    name={user.name}
                    imageUrl={user.avatarUrl}
                    decorative={false}
                />
                <span className="sr-only">{t('account.menuLabel', { name: user.name })}</span>
            </Menu.Trigger>
            <Menu.Popup>
                <div className="px-2 pt-1.5 pb-2">
                    <p className="text-md text-fg truncate font-semibold">{user.name}</p>
                    <p className="text-fg-muted truncate text-sm">{user.email}</p>
                </div>
                <Menu.Separator />
                <Menu.Item
                    onClick={onSignOut}
                    disabled={signingOut}
                >
                    <LogOut aria-hidden />
                    {t('account.signOut')}
                </Menu.Item>
            </Menu.Popup>
        </Menu.Root>
    );
}
