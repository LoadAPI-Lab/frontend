// Codes core puts in `/oauth/callback?error=<code>` (apps/core/src/auth/domain/errors).
const messageKeys = {
    'OAUTH.PROVIDER_NOT_SUPPORTED': 'auth.errors.providerUnavailable',
    'OAUTH.PROVIDER_NOT_CONFIGURED': 'auth.errors.providerUnavailable',
    'OAUTH.STATE_MISMATCH': 'auth.errors.stateMismatch',
    'OAUTH.PROVIDER_DENIED': 'auth.errors.denied',
    'OAUTH.PROFILE_INVALID': 'auth.errors.profileInvalid',
    'OAUTH.EMAIL_NOT_VERIFIED': 'auth.errors.emailNotVerified',
    'AUTH.SESSION_INVALID': 'auth.errors.sessionInvalid',
} as const;

type KnownCode = keyof typeof messageKeys;

function isKnownCode(code: string): code is KnownCode {
    return Object.hasOwn(messageKeys, code);
}

/** The i18n key for a sign-in error code; unknown codes get the generic message. */
export function oauthErrorKey(code: string) {
    return isKnownCode(code) ? messageKeys[code] : 'auth.errors.failed';
}
