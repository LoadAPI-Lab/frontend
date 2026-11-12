import { describe, expect, it } from 'vitest';

import { estimateRequests, isLoadPresetId, LOAD_PRESETS, matchPreset } from './load-presets';
import { DEFAULT_CONFIG } from './test-config';

describe('estimateRequests', () => {
    it('multiplies RPS by duration without ramp-up', () => {
        expect(estimateRequests({ targetRps: 50, durationSeconds: 90, rampUpSeconds: 0 })).toBe(
            4500,
        );
    });

    it('counts the linear ramp-up as half its length', () => {
        expect(estimateRequests({ targetRps: 50, durationSeconds: 120, rampUpSeconds: 30 })).toBe(
            5250,
        );
        expect(estimateRequests({ targetRps: 10, durationSeconds: 60, rampUpSeconds: 60 })).toBe(
            300,
        );
    });

    it('rounds to whole requests', () => {
        expect(estimateRequests({ targetRps: 3, durationSeconds: 10, rampUpSeconds: 3 })).toBe(26);
    });
});

describe('matchPreset', () => {
    it('finds the preset whose values match', () => {
        expect(matchPreset(LOAD_PRESETS.smoke)).toBe('smoke');
        expect(matchPreset(LOAD_PRESETS.load)).toBe('load');
        expect(matchPreset({ ...LOAD_PRESETS.spike, rampUpSeconds: null })).toBe('spike');
    });

    it('falls back to custom once any value differs', () => {
        expect(matchPreset(DEFAULT_CONFIG)).toBe('custom');
        expect(matchPreset({ ...LOAD_PRESETS.load, rampUpSeconds: 31 })).toBe('custom');
        expect(matchPreset({ ...LOAD_PRESETS.smoke, targetRps: null })).toBe('custom');
    });
});

describe('isLoadPresetId', () => {
    it('accepts only preset ids', () => {
        expect(isLoadPresetId('spike')).toBe(true);
        expect(isLoadPresetId('custom')).toBe(false);
        expect(isLoadPresetId(null)).toBe(false);
    });
});
