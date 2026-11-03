import { AxeBuilder } from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// Runs against `pnpm build:mock` (MSW answers the API), see playwright.config.ts.

test('signed-in user lands on stress tests with the app shell', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/tests$/);
    await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Stress tests', level: 1 })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Collections' })).toBeVisible();
});

test('navigates between top-level pages', async ({ page }) => {
    await page.goto('/tests');
    await page.getByRole('link', { name: 'History' }).click();
    await expect(page.getByRole('heading', { name: 'History', level: 1 })).toBeVisible();
    await page.getByRole('link', { name: 'Scenarios' }).click();
    await expect(page.getByRole('heading', { name: 'Scenarios', level: 1 })).toBeVisible();
});

test('sidebar collapse is remembered after a reload', async ({ page }) => {
    await page.goto('/tests');
    await page.getByRole('button', { name: 'Collapse sidebar' }).click();
    await page.reload();
    await expect(page.getByRole('button', { name: 'Expand sidebar' })).toBeVisible();
});

test('signing out from the account menu lands on login', async ({ page }) => {
    await page.goto('/tests');
    await page.getByRole('button', { name: /account menu for/i }).click();
    await page.getByRole('menuitem', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/\/login/);
});

test('unknown pages show the not-found screen', async ({ page }) => {
    await page.goto('/does-not-exist');
    await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
    await page.getByRole('link', { name: 'Back to stress tests' }).click();
    await expect(page).toHaveURL(/\/tests$/);
});

test('login page offers both OAuth providers', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('link', { name: 'Continue with Google' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Continue with GitHub' })).toBeVisible();
});

test('shows the desktop-only notice on small screens', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/login');
    await expect(page.getByRole('alert')).toContainText('Desktop only');
});

for (const path of ['/tests', '/login']) {
    test(`no serious accessibility violations on ${path}`, async ({ page }) => {
        await page.goto(path);
        const results = await new AxeBuilder({ page }).analyze();
        const serious = results.violations.filter(
            (v) => v.impact === 'serious' || v.impact === 'critical',
        );
        expect(serious).toEqual([]);
    });
}
