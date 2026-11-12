import { AxeBuilder } from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

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
    await expect(
        page.getByRole('region', { name: 'Endpoint' }).getByRole('textbox', { name: 'Base URL' }),
    ).toHaveValue('https://api.shop.example.com/v2');
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
    await page.getByRole('tab', { name: 'Auth' }).click();
    await expect(page.getByRole('button', { name: 'Bearer token', pressed: true })).toBeVisible();
});

test('an edited body survives switching endpoints until it is reset to the example', async ({
    page,
}) => {
    const orders = '/tests?spec=0b7e4a52-3c1d-4f8e-9a6b-5d2c1e0f9a37&endpoint=POST%20%2Forders';
    await page.goto(orders);
    await page.evaluate('sessionStorage.clear()');
    const body = page.getByRole('textbox', { name: 'Request body' });
    await expect(body).toContainText('"quantity": 1');
    await body.click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.insertText('{"quantity": 42}');
    await page.goto('/tests?spec=0b7e4a52-3c1d-4f8e-9a6b-5d2c1e0f9a37&endpoint=GET%20%2Fhealth');
    await expect(page.getByRole('heading', { name: '/health', level: 2 })).toBeVisible();
    await page.goto(orders);
    await expect(body).toContainText('"quantity": 42');
    await page.getByRole('button', { name: 'Fill with example' }).click();
    await expect(body).toContainText('"productId": "{{$uuid}}"');
    await page.reload();
    await expect(body).toContainText('"comment": "example"');
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
    const baseUrl = page.getByRole('textbox', { name: 'Base URL' });
    await expect(baseUrl).toBeEditable();
    await page.getByRole('button', { name: 'Start test' }).click();
    await expect(baseUrl).toBeDisabled();
    await page.getByRole('button', { name: 'Stop test' }).click();
    await expect(page.getByRole('button', { name: 'Start test' })).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Test stopped')).toBeVisible();
    await expect(baseUrl).toBeEditable();
});

test('Send shows the response of one request before a load test', async ({ page }) => {
    await page.goto('/tests?spec=4f1c2b7a-9e3d-4a51-8c6f-0d2e7b9a1c35&endpoint=GET%20%2Ffixed');
    const response = page.getByRole('region', { name: 'Response', exact: true });
    await expect(response.getByText('No response yet')).toBeVisible();
    await page.getByRole('button', { name: 'Send', exact: true }).click();
    await expect(response.getByText('200 OK')).toBeVisible();
    await expect(response.getByLabel('Response body')).toContainText('"method": "GET"');
    await response.getByRole('tab', { name: /^Headers/ }).click();
    await expect(response.getByRole('row', { name: /set-cookie/ })).toHaveCount(2);

    await page.getByRole('textbox', { name: 'Base URL' }).fill('http://10.0.0.1');
    await page.getByRole('button', { name: 'Send', exact: true }).click();
    await expect(response.getByRole('alert')).toContainText('private or internal network');
});

test('after a run, Send switches back to the response and the charts stay one click away', async ({
    page,
}) => {
    await page.goto('/tests?spec=4f1c2b7a-9e3d-4a51-8c6f-0d2e7b9a1c35&endpoint=GET%20%2Ffixed');
    await page.getByRole('textbox', { name: /Duration/ }).fill('2');
    await page.getByRole('button', { name: 'Start test' }).click();
    await expect(page.getByRole('button', { name: 'Send', exact: true })).toBeHidden();
    await expect(page.getByRole('button', { name: 'Start test' })).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: 'Send', exact: true }).click();
    const response = page.getByRole('region', { name: 'Response', exact: true });
    await expect(response.getByText('200 OK')).toBeVisible();
    const panels = page.getByRole('group', { name: 'Results' });
    await panels.getByRole('button', { name: 'Live metrics' }).click();
    await expect(
        page.getByRole('figure', { name: /^Latency chart\. Latest second/ }),
    ).toBeVisible();
    await expect(response).toBeHidden();
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
    await dialog.getByRole('textbox', { name: 'OpenAPI document' }).fill(
        JSON.stringify({
            openapi: '3.0.3',
            info: { title: 'Pet Store', version: '1.0.0' },
            paths: { '/pets': { get: { tags: ['pets'] } } },
        }),
    );
    await expect(dialog.getByText('OpenAPI 3.0 · 1 endpoint · 1 tag')).toBeVisible();
    await dialog.getByRole('button', { name: 'Import' }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByRole('treeitem', { name: /^Pet Store/ })).toHaveAttribute(
        'aria-expanded',
        'true',
    );
});

test('importing a chosen file previews the same counts the sidebar shows', async ({ page }) => {
    await page.goto('/tests');
    await page.getByRole('button', { name: 'Import OpenAPI doc' }).click();
    const dialog = page.getByRole('dialog', { name: 'Import an OpenAPI doc' });
    const chooser = page.waitForEvent('filechooser');
    await dialog.getByRole('button', { name: 'Choose file' }).click();
    await (await chooser).setFiles('e2e/fixtures/pet-store.yaml');
    await expect(dialog.getByText('OpenAPI 3.1 · 5 endpoints · 2 tags')).toBeVisible();
    await expect(dialog.getByRole('textbox', { name: 'Name (optional)' })).toHaveAttribute(
        'placeholder',
        'Pet Store',
    );
    const axe = await new AxeBuilder({ page }).include('[role="dialog"]').analyze();
    expect(axe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual(
        [],
    );
    await dialog.getByRole('button', { name: 'Import' }).click();
    await expect(dialog).toBeHidden();
    const tree = page.getByRole('tree', { name: 'Collections' });
    await expect(
        tree.getByRole('treeitem', { name: /^Pet Store\b.*5 endpoints$/ }),
    ).toHaveAttribute('aria-expanded', 'true');
    await expect(tree.getByRole('treeitem', { name: /^pets.*3 endpoints$/ })).toBeVisible();
    await expect(tree.getByRole('treeitem', { name: /^users.*1 endpoint$/ })).toBeVisible();
});

test('a saved doc can be re-imported with a new version from the keyboard', async ({ page }) => {
    await page.goto('/tests');
    const tree = page.getByRole('tree', { name: 'Collections' });
    await tree.getByRole('treeitem', { name: /^Shop API/ }).focus();
    await page.keyboard.press('Shift+F10');
    await page.getByRole('menuitem', { name: 'Re-import…' }).click();
    const dialog = page.getByRole('dialog', { name: 'Re-import Shop API' });
    await dialog.getByRole('textbox', { name: 'OpenAPI document' }).fill(
        JSON.stringify({
            openapi: '3.0.3',
            info: { title: 'Shop API', version: '2.2.0' },
            paths: {
                '/products': { get: { summary: 'List all products', tags: ['products'] } },
                '/carts': { post: { summary: 'Create a cart', tags: ['carts'] } },
            },
        }),
    );
    await dialog.getByRole('button', { name: 'Re-import' }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText('Shop API re-imported')).toBeVisible();
    await expect(page.getByText('1 added, 1 changed, 4 removed')).toBeVisible();
    await expect(tree.getByRole('treeitem', { name: /^Shop API\b.*2 endpoints$/ })).toHaveAttribute(
        'aria-expanded',
        'true',
    );
    await expect(tree.getByRole('treeitem', { name: /^carts/ })).toBeVisible();
});

test('a saved doc can be renamed from its actions menu', async ({ page }) => {
    await page.goto('/tests');
    const tree = page.getByRole('tree', { name: 'Collections' });
    await tree.getByRole('treeitem', { name: /^Shop API/ }).hover();
    await page.getByLabel('Actions for Shop API').click();
    await page.getByRole('menuitem', { name: 'Rename…' }).click();
    const dialog = page.getByRole('dialog', { name: 'Rename Shop API' });
    await dialog.getByRole('textbox', { name: 'Name' }).fill('Storefront');
    await dialog.getByRole('button', { name: 'Rename' }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText('Renamed to Storefront')).toBeVisible();
    await expect(tree.getByRole('treeitem', { name: /^Storefront/ })).toBeVisible();
});

test('deleting the open doc removes it and clears the Tests page', async ({ page }) => {
    await page.goto('/tests?spec=0b7e4a52-3c1d-4f8e-9a6b-5d2c1e0f9a37&endpoint=GET%20%2Fhealth');
    await expect(page.getByRole('heading', { name: '/health', level: 2 })).toBeVisible();
    const tree = page.getByRole('tree', { name: 'Collections' });
    const shop = tree.getByRole('treeitem', { name: /^Shop API/ });
    await shop.hover();
    await page.getByLabel('Actions for Shop API').click();
    await page.getByRole('menuitem', { name: 'Delete…' }).click();
    const confirm = page.getByRole('alertdialog', { name: 'Delete Shop API?' });
    await confirm.getByRole('button', { name: 'Delete' }).click();
    await expect(confirm).toBeHidden();
    await expect(page.getByText('Shop API deleted')).toBeVisible();
    await expect(shop).toHaveCount(0);
    await expect(page).not.toHaveURL(/spec=/);
    await expect(
        page.getByText('Pick an endpoint from the sidebar', { exact: true }),
    ).toBeVisible();
});

test('with no endpoint picked the Tests page shows one empty state', async ({ page }) => {
    await page.goto('/tests');
    const main = page.getByRole('main');
    await expect(main.getByText('Pick an endpoint from the sidebar', { exact: true })).toHaveCount(
        1,
    );
    await expect(main.getByRole('textbox', { name: 'Request body' })).toHaveCount(0);
    await expect(main.getByRole('figure')).toHaveCount(0);
    await expect(main.getByRole('heading', { name: 'Recent runs' })).toBeVisible();
    const start = main.getByRole('button', { name: 'Start test' });
    await expect(start).toBeDisabled();
    await expect(start).toHaveAccessibleDescription('Pick an endpoint from the sidebar first.');
});

async function deleteDoc(page: Page, name: string) {
    const tree = page.getByRole('tree', { name: 'Collections' });
    await tree.getByRole('treeitem', { name: new RegExp(`^${name}`) }).hover();
    await page.getByLabel(`Actions for ${name}`).click();
    await page.getByRole('menuitem', { name: 'Delete…' }).click();
    await page
        .getByRole('alertdialog', { name: `Delete ${name}?` })
        .getByRole('button', { name: 'Delete' })
        .click();
    await expect(page.getByText(`${name} deleted`)).toBeVisible();
}

test('a fresh account sees the import call to action on the Tests page', async ({ page }) => {
    await page.goto('/tests');
    await deleteDoc(page, 'Shop API');
    await deleteDoc(page, 'LoadAPI test server');
    const main = page.getByRole('main');
    await expect(main.getByText('Import an OpenAPI doc to start')).toBeVisible();
    await main.getByRole('button', { name: 'Import OpenAPI doc' }).click();
    await expect(page.getByRole('dialog', { name: 'Import an OpenAPI doc' })).toBeVisible();
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

test('a run opened without its doc can be changed and started again', async ({ page }) => {
    await page.goto('/tests?spec=4f1c2b7a-9e3d-4a51-8c6f-0d2e7b9a1c35&endpoint=GET%20%2Ffixed');
    await page.getByRole('textbox', { name: /Duration/ }).fill('2');
    await page.getByRole('button', { name: 'Start test' }).click();
    await expect(page.getByText('Test completed')).toBeVisible({ timeout: 10_000 });
    await page.evaluate('sessionStorage.clear()');

    await page
        .getByRole('navigation', { name: 'Main' })
        .getByRole('link', { name: 'History' })
        .click();
    await page.getByRole('link', { name: 'Open charts' }).click();
    await expect(page).toHaveURL(/\/tests\?run=/);
    const header = page.getByRole('region', { name: 'Endpoint' });
    await expect(header.getByRole('heading', { name: '/fixed', level: 2 })).toBeVisible();
    await expect(header.getByText('GET', { exact: true })).toBeVisible();
    const baseUrl = header.getByRole('textbox', { name: 'Base URL' });
    await expect(baseUrl).toHaveValue('http://testserver:8080');
    await expect(page.getByRole('textbox', { name: /Duration/ })).toHaveValue('2');

    const firstRun = new URL(page.url()).searchParams.get('run');
    await baseUrl.fill('http://localhost:8080');
    await page.getByRole('textbox', { name: /Duration/ }).fill('1');
    await page.getByRole('button', { name: 'Start test' }).click();
    await expect(page).not.toHaveURL(new RegExp(`run=${firstRun}`));
    await expect(baseUrl).toBeDisabled();
    await expect(header.getByRole('heading', { name: '/fixed', level: 2 })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Start test' })).toBeVisible({ timeout: 10_000 });
    await expect(baseUrl).toHaveValue('http://localhost:8080');
});

test('a finished run shows up in History with its results', async ({ page }) => {
    await page.goto('/tests?spec=4f1c2b7a-9e3d-4a51-8c6f-0d2e7b9a1c35&endpoint=GET%20%2Ffixed');
    await page.getByRole('textbox', { name: /Duration/ }).fill('2');
    await page.getByRole('button', { name: 'Start test' }).click();
    await expect(page.getByText('Test completed')).toBeVisible({ timeout: 10_000 });

    await page
        .getByRole('navigation', { name: 'Main' })
        .getByRole('link', { name: 'History' })
        .click();
    const runs = page.getByRole('navigation', { name: 'Test runs' });
    await expect(runs.getByRole('link', { name: /\/fixed/ }).first()).toBeVisible();
    await expect(page.getByRole('heading', { name: '/fixed', level: 2 })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Re-run test' })).toBeVisible();
    await expect(page.getByText('Avg RPS')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Expand sidebar' })).toBeVisible();

    await page.getByRole('link', { name: 'Open charts' }).click();
    await expect(page).toHaveURL(/\/tests\?.*run=/);
    await page
        .getByRole('navigation', { name: 'Main' })
        .getByRole('link', { name: 'History' })
        .click();

    await page
        .getByRole('navigation', { name: 'Main' })
        .getByRole('link', { name: 'Stress tests' })
        .click();
    await expect(page.getByRole('button', { name: 'Collapse sidebar' })).toBeVisible();
});

test('History can be searched and filtered by status, and back keeps the filters', async ({
    page,
}) => {
    await page.goto('/tests?spec=4f1c2b7a-9e3d-4a51-8c6f-0d2e7b9a1c35&endpoint=GET%20%2Ffixed');
    await page.getByRole('textbox', { name: /Duration/ }).fill('1');
    await page.getByRole('button', { name: 'Start test' }).click();
    await expect(page.getByText('Test completed')).toBeVisible({ timeout: 10_000 });

    await page
        .getByRole('navigation', { name: 'Main' })
        .getByRole('link', { name: 'History' })
        .click();
    const runs = page.getByRole('navigation', { name: 'Test runs' });
    await expect(runs.getByRole('link', { name: /\/fixed/ })).toBeVisible();

    await page.getByRole('searchbox', { name: 'Search runs' }).fill('/nothing');
    await expect(runs.getByText('No runs match')).toBeVisible();
    await expect(page).toHaveURL(/q=/);
    await runs.getByRole('button', { name: 'Clear filters' }).click();
    await expect(page.getByRole('searchbox', { name: 'Search runs' })).toHaveValue('');
    await expect(runs.getByRole('link', { name: /\/fixed/ })).toBeVisible();

    const status = page.getByRole('combobox', { name: 'Status' });
    await status.click();
    await page.getByRole('option', { name: 'Failed' }).click();
    await expect(page).toHaveURL(/status=failed/);
    await expect(runs.getByText('No runs match')).toBeVisible();

    await page.goBack();
    await expect(page).not.toHaveURL(/status=/);
    await expect(status).toContainText('All statuses');
    await expect(runs.getByRole('link', { name: /\/fixed/ })).toBeVisible();

    await page.goForward();
    await expect(page).toHaveURL(/status=failed/);
    await expect(status).toContainText('Failed');

    const group = page.getByRole('button', { name: 'Group by endpoint' });
    await expect(group).toHaveAttribute('aria-pressed', 'true');
    await group.click();
    await expect(page).toHaveURL(/group=day/);
    await expect(group).toHaveAttribute('aria-pressed', 'false');
    await runs.getByRole('button', { name: 'Clear filters' }).click();
    await expect(page).not.toHaveURL(/status=/);
    await expect(page).toHaveURL(/group=day/);
    await expect(runs.getByRole('region', { name: /^today/i })).toBeVisible();
});
