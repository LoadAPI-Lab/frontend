export type DayGroup = 'today' | 'yesterday' | 'thisWeek' | 'earlier';

const DAY_MS = 86_400_000;

const startOfDay = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

export function dayGroup(iso: string, now = new Date()): DayGroup {
    const days = Math.round((startOfDay(now) - startOfDay(new Date(iso))) / DAY_MS);
    if (days <= 0) {
        return 'today';
    }
    if (days === 1) {
        return 'yesterday';
    }
    return days < 7 ? 'thisWeek' : 'earlier';
}

export function runPath(url: string): string {
    try {
        const parsed = new URL(url);
        return `${decodeURI(parsed.pathname)}${parsed.search}`;
    } catch {
        return url;
    }
}

export function runHost(url: string): string {
    try {
        return new URL(url).host;
    } catch {
        return '';
    }
}

export function runOrigin(url: string): string {
    try {
        return new URL(url).origin;
    } catch {
        return url;
    }
}

export const shortRunId = (id: string) => id.replaceAll('-', '').slice(0, 6);

export function formatRunTime(iso: string, locale: string, now = new Date()): string {
    const date = new Date(iso);
    const group = dayGroup(iso, now);
    if (group === 'today' || group === 'yesterday') {
        return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(date);
    }
    return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(date);
}

export function formatRunDateTime(iso: string, locale: string): string {
    return new Intl.DateTimeFormat(locale, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(iso));
}

export function percentChange(now: number, before: number): number | null {
    return before === 0 ? null : ((now - before) / before) * 100;
}
