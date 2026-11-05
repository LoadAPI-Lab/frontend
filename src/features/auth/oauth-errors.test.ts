import { describe, expect, it } from 'vitest';

import { oauthErrorKey } from './oauth-errors';

describe('oauthErrorKey', () => {
    it('maps core’s codes to messages', () => {
        expect(oauthErrorKey('OAUTH.PROVIDER_DENIED')).toBe('auth.errors.denied');
        expect(oauthErrorKey('OAUTH.PROVIDER_NOT_CONFIGURED')).toBe(
            'auth.errors.providerUnavailable',
        );
    });

    it('falls back to the generic message for unknown codes', () => {
        expect(oauthErrorKey('SOMETHING.ELSE')).toBe('auth.errors.failed');
        expect(oauthErrorKey('toString')).toBe('auth.errors.failed');
    });
});
