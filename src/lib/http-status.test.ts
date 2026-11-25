import { describe, expect, it } from 'vitest';

import en from '@/locales/en/common.json';

import { isKnownStatusCode, KNOWN_STATUS_CODES } from './http-status';

describe('isKnownStatusCode', () => {
    it('knows common codes and nothing else', () => {
        expect(isKnownStatusCode('404')).toBe(true);
        expect(isKnownStatusCode('429')).toBe(true);
        expect(isKnownStatusCode('599')).toBe(false);
        expect(isKnownStatusCode('')).toBe(false);
    });

    it('has an English reason phrase for every known code', () => {
        for (const code of KNOWN_STATUS_CODES) {
            expect(en.httpStatus.reasons[code]).toMatch(/\w/);
        }
    });
});
