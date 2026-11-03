import type { ReactNode } from 'react';

import { Tooltip } from '@/components/ui/tooltip';

import { TopBar } from './top-bar';

export interface AppShellProps {
    /** Usually a <Sidebar>. */
    sidebar?: ReactNode;
    topBarActions?: ReactNode;
    children: ReactNode;
}

/** Layout only: slots in, no data. The signed-in route fills the slots with feature components. */
export function AppShell({ sidebar, topBarActions, children }: AppShellProps) {
    return (
        <Tooltip.Provider delay={400}>
            <div className="flex h-dvh flex-col">
                <TopBar actions={topBarActions} />
                <div className="flex min-h-0 flex-1">
                    {sidebar}
                    <main className="flex min-w-0 flex-1 flex-col gap-3 overflow-y-auto px-5.5 pt-4 pb-5">
                        {children}
                    </main>
                </div>
            </div>
        </Tooltip.Provider>
    );
}
