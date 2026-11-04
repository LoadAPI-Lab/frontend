import { safeRedirect } from '@/lib/safe-redirect';

// Core's OAuth flow takes no redirect parameter: it always lands on /oauth/callback.
// So the page to return to is kept in this tab until the callback reads it.
const KEY = 'routelab.auth.redirect';
export const DEFAULT_AFTER_LOGIN = '/tests';

export function savePostLoginRedirect(path: string | undefined) {
    try {
        sessionStorage.setItem(KEY, safeRedirect(path, DEFAULT_AFTER_LOGIN));
    } catch {
        // storage blocked: the callback falls back to the default page
    }
}

/** Reads and forgets the saved path; always a same-app path. */
export function takePostLoginRedirect(): string {
    let saved: string | null = null;
    try {
        saved = sessionStorage.getItem(KEY);
        sessionStorage.removeItem(KEY);
    } catch {
        // storage blocked
    }
    return safeRedirect(saved, DEFAULT_AFTER_LOGIN);
}
