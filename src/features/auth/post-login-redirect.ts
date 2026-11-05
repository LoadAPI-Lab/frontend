import { safeRedirect } from '@/lib/safe-redirect';

const KEY = 'routelab.auth.redirect';
export const DEFAULT_AFTER_LOGIN = '/tests';

export function savePostLoginRedirect(path: string | undefined) {
    try {
        sessionStorage.setItem(KEY, safeRedirect(path, DEFAULT_AFTER_LOGIN));
    } catch {
        return;
    }
}

export function takePostLoginRedirect(): string {
    let saved: string | null = null;
    try {
        saved = sessionStorage.getItem(KEY);
        sessionStorage.removeItem(KEY);
    } catch {
        saved = null;
    }
    return safeRedirect(saved, DEFAULT_AFTER_LOGIN);
}
