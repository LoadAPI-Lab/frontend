export function formatNumber(value: number, fractionDigits = 0, locale?: string) {
    return new Intl.NumberFormat(locale, {
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits,
    }).format(value);
}

export function formatClock(totalSeconds: number) {
    const seconds = Math.max(0, Math.floor(totalSeconds));
    const minutes = Math.floor(seconds / 60);
    return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

const RELATIVE_STEPS: [Intl.RelativeTimeFormatUnit, number][] = [
    ['minute', 60],
    ['hour', 24],
    ['day', 7],
    ['week', 4.35],
    ['month', 12],
    ['year', Number.POSITIVE_INFINITY],
];

export function formatRelativeTime(iso: string, locale: string, now = Date.now()): string {
    const format = new Intl.RelativeTimeFormat(locale, { numeric: 'auto', style: 'short' });
    let value = (new Date(iso).getTime() - now) / 60_000;
    for (const [unit, size] of RELATIVE_STEPS) {
        if (Math.abs(value) < size) {
            return format.format(Math.round(value), unit);
        }
        value /= size;
    }
    return format.format(Math.round(value), 'year');
}
