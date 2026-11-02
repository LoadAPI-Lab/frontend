import type { ReactNode } from 'react';

import { TopBar } from './top-bar';

export interface AppShellProps {
    sidebar?: ReactNode;
    topBarActions?: ReactNode;
    children: ReactNode;
}

/** Layout only: slots in, no data. The authed route fills the slots with feature components. */
export function AppShell({ sidebar, topBarActions, children }: AppShellProps) {
    return (
        <div className="flex h-dvh flex-col">
            <TopBar actions={topBarActions} />
            <div className="flex min-h-0 flex-1">
                {sidebar ? (
                    <aside className="border-border w-72 shrink-0 overflow-y-auto border-r">
                        {sidebar}
                    </aside>
                ) : null}
                <main className="min-w-0 flex-1 overflow-y-auto p-6">{children}</main>
            </div>
        </div>
    );
}
