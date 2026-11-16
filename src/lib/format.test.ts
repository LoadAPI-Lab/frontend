import { describe, expect, it } from 'vitest';

import { formatClock, formatNumber, formatRelativeTime } from './format';

describe('formatNumber', () => {
    it('groups thousands and fixes the fraction digits', () => {
        expect(formatNumber(12_480, 0, 'en')).toBe('12,480');
        expect(formatNumber(297.44, 1, 'en')).toBe('297.4');
        expect(formatNumber(2, 1, 'en')).toBe('2.0');
    });
});

describe('formatClock', () => {
    it('shows minutes and seconds', () => {
        expect(formatClock(0)).toBe('00:00');
        expect(formatClock(42)).toBe('00:42');
        expect(formatClock(600)).toBe('10:00');
    });

    it('never goes negative', () => {
        expect(formatClock(-3)).toBe('00:00');
    });
});

describe('formatRelativeTime', () => {
    const at = new Date(2026, 10, 9, 10, 0).getTime();
    const ago = (minutes: number) => new Date(at - minutes * 60_000).toISOString();

    it('says how long ago a run started', () => {
        expect(formatRelativeTime(ago(120), 'en', at)).toBe('2 hr. ago');
        expect(formatRelativeTime(ago(24 * 60), 'en', at)).toBe('yesterday');
        expect(formatRelativeTime(ago(3 * 24 * 60), 'en', at)).toBe('3 days ago');
    });
});
