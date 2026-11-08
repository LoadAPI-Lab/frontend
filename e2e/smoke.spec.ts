import { AxeBuilder } from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('signed-in user lands on stress tests with the app shell', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/tests$/);
    await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Stress tests', level: 1 })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Collections' })).toBeVisible();
});

test('picking an endpoint in the collections tree opens it on the Tests page', async ({ page }) => {
    await page.goto('/tests');
    const tree = page.getByRole('tree', { name: 'Collections' });
    await tree.getByText('Shop API').click();
    await tree.getByText('products').click();
    await tree.getByRole('treeitem', { name: 'GET /products/{productId}' }).click();
    await expect(page).toHaveURL(/spec=0b7e4a52-3c1d-4f8e-9a6b-5d2c1e0f9a37/);
    await expect(page).toHaveURL(/endpoint=GET/);
    await expect(
        page.getByRole('heading', { name: '/products/{productId}', level: 2 }),
    ).toBeVisible();
    await expect(page.getByText('Shop API', { exact: true }).last()).toBeVisible();
    await page.reload();
    await expect(
        page.getByRole('heading', { name: '/products/{productId}', level: 2 }),
    ).toBeVisible();
});

test('an endpoint opens with its example body and a Bearer auth tab', async ({ page }) => {
    await page.goto('/tests?spec=0b7e4a52-3c1d-4f8e-9a6b-5d2c1e0f9a37&endpoint=POST%20%2Forders');
    await expect(page.getByRole('heading', { name: '/orders', level: 2 })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Request body' })).toContainText(
        '"quantity": 1',
    );
    await page.getByRole('button', { name: 'Fill with placeholders' }).click();
    await expect(page.getByRole('textbox', { name: 'Request body' })).toContainText(
        '{{$randomInt}}',
    );
    await page.getByRole('tab', { name: 'Auth' }).click();
    await expect(page.getByRole('button', { name: 'Bearer token', pressed: true })).toBeVisible();
});

test('a started run streams live and finishes on its own', async ({ page }) => {
    await page.goto('/tests?spec=4f1c2b7a-9e3d-4a51-8c6f-0d2e7b9a1c35&endpoint=GET%20%2Ffixed');
    const duration = page.getByRole('textbox', { name: /Duration/ });
    await duration.fill('3');
    await page.getByRole('textbox', { name: 'Ramp-up (seconds)' }).fill('1');
    await page.getByRole('button', { name: 'Start test' }).click();
    await expect(page.getByRole('button', { name: 'Stop test' })).toBeVisible();
    await expect(page).toHaveURL(/run=/);
    await expect(page.getByRole('status').filter({ hasText: 'Running' })).toBeVisible();
    await expect(
        page.getByRole('figure', { name: /^Latency chart\. Latest second/ }),
    ).toBeVisible();
    await expect(page.getByRole('definition').first()).not.toHaveText('—');
    await expect(page.getByRole('button', { name: 'Start test' })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('status').filter({ hasText: 'Completed' })).toBeVisible();
    await expect(page.getByText('Test completed')).toBeVisible();
    await expect(page.getByText(/^avg RPS · target/)).toBeVisible();

    const nav = page.getByRole('navigation', { name: 'Main' });
    await nav.getByRole('link', { name: 'History' }).click();
    await expect(page).toHaveURL(/\/history/);
    await nav.getByRole('link', { name: 'Stress tests' }).click();
    await expect(page).toHaveURL(/run=/);
    await expect(page.getByText(/^avg RPS · target/)).toBeVisible();
    await expect(
        page.getByRole('figure', { name: /^Latency chart\. Latest second/ }),
    ).toBeVisible();
    await expect(page.getByRole('progressbar', { name: 'Test progress' })).toHaveAttribute(
        'value',
        '100',
    );
});

test('a running test can be stopped', async ({ page }) => {
    await page.goto('/tests?spec=4f1c2b7a-9e3d-4a51-8c6f-0d2e7b9a1c35&endpoint=GET%20%2Ffixed');
    await page.getByRole('button', { name: 'Start test' }).click();
    await page.getByRole('button', { name: 'Stop test' }).click();
    await expect(page.getByRole('button', { name: 'Start test' })).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Test stopped')).toBeVisible();
});

test('a link to an unknown endpoint shows the not-found state', async ({ page }) => {
    await page.goto('/tests?spec=0b7e4a52-3c1d-4f8e-9a6b-5d2c1e0f9a37&endpoint=GET%20%2Fnope');
    await expect(page.getByText("This endpoint isn't in your collections")).toBeVisible();
    await page.goto('/tests?spec=00000000-0000-0000-0000-000000000000&endpoint=GET%20%2Fx');
    await expect(page.getByText("This endpoint isn't in your collections")).toBeVisible();
});

test('importing a pasted OpenAPI doc adds it to the collections', async ({ page }) => {
    await page.goto('/tests');
    await page.getByRole('button', { name: 'Import OpenAPI doc' }).click();
    const dialog = page.getByRole('dialog', { name: 'Import an OpenAPI doc' });
    await dialog
        .getByRole('textbox', { name: 'OpenAPI document' })
        .fill('openapi: 3.0.3\ninfo:\n  title: Pet Store\n  version: 1.0.0\npaths: {}\n');
    await dialog.getByRole('button', { name: 'Import' }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByRole('treeitem', { name: /^Pet Store/ })).toHaveAttribute(
        'aria-expanded',
        'true',
    );
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

test('signing in returns to the page the user asked for', async ({ page }) => {
    await page.goto('/login?redirect=%2Fhistory');
    await page.getByRole('link', { name: 'Continue with GitHub' }).click();
    await expect(page).toHaveURL(/\/history$/);
    await expect(page.getByRole('heading', { name: 'History', level: 1 })).toBeVisible();
});

test('a failed sign-in comes back to login with the reason', async ({ page }) => {
    await page.goto('/oauth/callback?error=OAUTH.PROVIDER_DENIED');
    await expect(page).toHaveURL(/\/login\?/);
    await expect(page.getByRole('alert')).toHaveText('Sign-in was cancelled at the provider.');
    await expect(page.getByRole('link', { name: 'Continue with Google' })).toBeVisible();
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
