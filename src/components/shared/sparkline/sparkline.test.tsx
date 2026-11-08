import { describe, expect, it } from 'vitest';

import { sparklinePoints } from './sparkline';

describe('sparklinePoints', () => {
    it('spreads the values across the width and scales them to the height', () => {
        expect(sparklinePoints([0, 50, 100], 100, 22)).toBe('0.0,20.8 50.0,11.0 100.0,1.3');
    });

    it('skips gaps', () => {
        expect(sparklinePoints([10, null, 10], 100, 22)).toBe('0.0,1.3 100.0,1.3');
    });

    it('draws nothing with fewer than two points', () => {
        expect(sparklinePoints([5], 100, 22)).toBe('');
        expect(sparklinePoints([], 100, 22)).toBe('');
    });
});
