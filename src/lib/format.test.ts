import { describe, expect, it } from 'vitest';

import { formatClock, formatNumber } from './format';

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
