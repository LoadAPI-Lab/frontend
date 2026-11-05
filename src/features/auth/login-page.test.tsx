import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it } from 'vitest';

import { server } from '@/mocks/server';
import { renderWithProviders } from '@/test/render';

import { LoginPage } from './login-page';

afterEach(() => sessionStorage.clear());

describe('LoginPage', () => {
    it('links each configured provider to core', async () => {
        renderWithProviders(<LoginPage />);
        expect(await screen.findByRole('link', { name: 'Continue with Google' })).toHaveAttribute(
            'href',
            '/v1/oauth/google',
        );
        expect(screen.getByRole('link', { name: 'Continue with GitHub' })).toHaveAttribute(
            'href',
            '/v1/oauth/github',
        );
    });

    it('only offers the providers core has configured', async () => {
        server.use(
            http.get('*/v1/oauth/providers', () =>
                HttpResponse.json([{ id: 'github', name: 'GitHub' }]),
            ),
        );
        renderWithProviders(<LoginPage />);
        expect(await screen.findByRole('link', { name: 'Continue with GitHub' })).toBeVisible();
        expect(screen.queryByRole('link', { name: 'Continue with Google' })).toBeNull();
    });

    it('says so when no provider is configured', async () => {
        server.use(http.get('*/v1/oauth/providers', () => HttpResponse.json([])));
        renderWithProviders(<LoginPage />);
        expect(await screen.findByText('No sign-in options are set up yet.')).toBeVisible();
    });

    it('remembers where to go back to before leaving for the provider', async () => {
        renderWithProviders(<LoginPage redirect="/history" />);
        const link = await screen.findByRole('link', { name: 'Continue with GitHub' });
        link.addEventListener('click', (event) => event.preventDefault());
        await userEvent.click(link);
        expect(sessionStorage.getItem('routelab.auth.redirect')).toBe('/history');
    });

    it('shows why the last sign-in failed', async () => {
        renderWithProviders(<LoginPage error="OAUTH.EMAIL_NOT_VERIFIED" />);
        expect(screen.getByRole('alert')).toHaveTextContent(
            'Your account has no verified email. Verify it with the provider, then try again.',
        );
        expect(await screen.findByRole('link', { name: 'Continue with Google' })).toBeVisible();
    });
});
