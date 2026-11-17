import { describe, expect, it } from 'vitest';

import { fittingCount } from './extract-summary';

describe('fittingCount', () => {
    it('shows every chip that fits without a more label', () => {
        expect(fittingCount(200, [50, 50, 50], 20)).toBe(3);
    });

    it('leaves room for the more label when chips overflow', () => {
        expect(fittingCount(150, [50, 50, 50], 20)).toBe(2);
        expect(fittingCount(120, [50, 50, 50], 20)).toBe(1);
        expect(fittingCount(40, [50, 50, 50], 20)).toBe(0);
    });

    it('shows all chips before the layout is known', () => {
        expect(fittingCount(0, [50, 50], 20)).toBe(2);
    });
});
