import { afterEach, describe, expect, it } from 'vitest';

import { savePostLoginRedirect, takePostLoginRedirect } from './post-login-redirect';

afterEach(() => sessionStorage.clear());

describe('post-login redirect', () => {
    it('returns the saved path once', () => {
        savePostLoginRedirect('/history?run=1');
        expect(takePostLoginRedirect()).toBe('/history?run=1');
        expect(takePostLoginRedirect()).toBe('/tests');
    });

    it('never keeps a path that leaves the app', () => {
        savePostLoginRedirect('https://evil.example');
        expect(takePostLoginRedirect()).toBe('/tests');
        savePostLoginRedirect('//evil.example');
        expect(takePostLoginRedirect()).toBe('/tests');
    });
});
