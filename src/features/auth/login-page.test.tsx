import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/test/render';

import { LoginPage } from './login-page';

describe('LoginPage', () => {
    it('links each provider to core with the redirect target', () => {
        renderWithProviders(<LoginPage redirect="/history" />);
        expect(screen.getByRole('link', { name: 'Continue with Google' })).toHaveAttribute(
            'href',
            '/api/v1/auth/google?redirect=%2Fhistory',
        );
        expect(screen.getByRole('link', { name: 'Continue with GitHub' })).toHaveAttribute(
            'href',
            '/api/v1/auth/github?redirect=%2Fhistory',
        );
    });

    it('drops redirects that leave the app', () => {
        renderWithProviders(<LoginPage redirect="https://evil.example" />);
        expect(screen.getByRole('link', { name: 'Continue with Google' })).toHaveAttribute(
            'href',
            '/api/v1/auth/google?redirect=%2Ftests',
        );
    });
});
