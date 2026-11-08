import { describe, expect, it } from 'vitest';

import { DEFAULT_CONFIG, validateConfig } from './test-config';

describe('validateConfig', () => {
    it('accepts the defaults', () => {
        expect(validateConfig(DEFAULT_CONFIG)).toEqual({});
    });

    it('applies core’s limits', () => {
        expect(validateConfig({ ...DEFAULT_CONFIG, targetRps: 0 })).toEqual({
            targetRps: { kind: 'range', min: 1, max: 1000 },
        });
        expect(validateConfig({ ...DEFAULT_CONFIG, targetRps: 1001 }).targetRps).toMatchObject({
            kind: 'range',
        });
        expect(validateConfig({ ...DEFAULT_CONFIG, durationSeconds: 601 }).durationSeconds).toEqual(
            {
                kind: 'range',
                min: 1,
                max: 600,
            },
        );
    });

    it('requires whole numbers and values', () => {
        expect(validateConfig({ ...DEFAULT_CONFIG, targetRps: 2.5 }).targetRps).toEqual({
            kind: 'wholeNumber',
        });
        expect(
            validateConfig({ ...DEFAULT_CONFIG, durationSeconds: null }).durationSeconds,
        ).toEqual({
            kind: 'required',
        });
    });

    it('keeps ramp-up within the duration', () => {
        expect(
            validateConfig({ ...DEFAULT_CONFIG, durationSeconds: 30, rampUpSeconds: 31 }),
        ).toEqual({
            rampUpSeconds: { kind: 'rampLongerThanDuration', max: 30 },
        });
        expect(validateConfig({ ...DEFAULT_CONFIG, rampUpSeconds: null })).toEqual({});
    });
});
