/** Only same-app paths are allowed as post-login redirects (blocks open redirects). */
export function safeRedirect(value: unknown, fallback = '/'): string {
    if (
        typeof value !== 'string' ||
        !value.startsWith('/') ||
        value.startsWith('//') ||
        value.startsWith('/\\')
    ) {
        return fallback;
    }
    return value;
}
