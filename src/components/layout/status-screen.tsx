import type { ReactNode } from 'react';

import { LogoMark } from '@/components/ui/icons';

export interface StatusScreenProps {
    title: ReactNode;
    body?: ReactNode;
    /** e.g. a retry button or a link home */
    action?: ReactNode;
    /** Shown small under the body so support can match backend logs. */
    requestId?: string | null;
}

/** Full-page state for errors and not-found, in the routelab style. */
export function StatusScreen({ title, body, action, requestId }: StatusScreenProps) {
    return (
        <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
            <span className="bg-accent text-accent-fg flex size-10 items-center justify-center rounded-lg">
                <LogoMark
                    width="20"
                    height="20"
                />
            </span>
            <div className="flex max-w-md flex-col gap-1.5">
                <h1 className="text-fg text-xl font-semibold tracking-tight">{title}</h1>
                {body ? <p className="text-fg-muted text-base">{body}</p> : null}
                {requestId ? <p className="text-fg-muted font-mono text-sm">{requestId}</p> : null}
            </div>
            {action}
        </main>
    );
}
