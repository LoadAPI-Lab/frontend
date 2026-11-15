import { AxeBuilder } from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('runs the saved scenario and shows a result for every step', async ({ page }) => {
    await page.goto('/scenarios');
    await expect(page.getByRole('textbox', { name: 'Scenario name' })).toHaveValue(
        'Task lifecycle',
    );
    await page.getByRole('button', { name: 'Run scenario' }).click();
    await expect(page.getByText('4/4')).toBeVisible();
    const lastRun = page.getByRole('region', { name: 'Last run' });
    await expect(lastRun.getByRole('listitem')).toHaveCount(4);
    await expect(lastRun.getByText('204')).toBeVisible();
});

test('a route clicked in the sidebar becomes a step and undefined variables are flagged', async ({
    page,
}) => {
    await page.goto('/scenarios?scenario=new');
    await page.evaluate('sessionStorage.clear()');
    const tree = page.getByRole('tree', { name: 'Collections' });
    await tree.getByText('LoadAPI test server').click();
    await tree.getByText('scenario', { exact: true }).click();
    await tree.getByRole('treeitem', { name: /PATCH \/tasks\/\{id\}/ }).click();

    const step = page.getByRole('article', { name: 'Step 1, PATCH' });
    await expect(step).toContainText('http://testserver:8080/tasks/');
    await step.getByRole('button', { name: /^PATCH http/ }).click();
    await page
        .getByRole('textbox', { name: 'Step 1 URL' })
        .fill('http://testserver:8080/tasks/{{taskId}}');
    await expect(page.getByText('Uses {{taskId}}, but no earlier step extracts it.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Run scenario' })).toBeDisabled();

    await page.getByRole('textbox', { name: 'Scenario name' }).fill('Patch only');
    await expect(page.getByRole('link', { name: /Patch only/ })).toBeVisible();
});

test('no serious accessibility violations on /scenarios', async ({ page }) => {
    await page.goto('/scenarios');
    await expect(page.getByRole('textbox', { name: 'Scenario name' })).toBeVisible();
    const results = await new AxeBuilder({ page }).analyze();
    const serious = results.violations.filter(
        (v) => v.impact === 'serious' || v.impact === 'critical',
    );
    expect(serious).toEqual([]);
});

test('a sent step shows its response and a picked value becomes an extract rule', async ({
    page,
}) => {
    await page.goto('/scenarios');
    await page.evaluate('sessionStorage.clear()');
    const first = page.getByRole('article', { name: 'Step 1, POST' });
    await first.getByRole('button', { name: /^POST http/ }).click();
    await first.getByRole('button', { name: 'Send' }).click();
    const response = first.getByRole('region', { name: 'Step 1 response' });
    await expect(response.getByText('200 OK')).toBeVisible();
    await response.getByRole('button', { name: /expiresIn/ }).click();
    await expect(page.getByRole('table').getByText('expiresIn').first()).toBeVisible();

    const results = await new AxeBuilder({ page }).analyze();
    const serious = results.violations.filter(
        (v) => v.impact === 'serious' || v.impact === 'critical',
    );
    expect(serious).toEqual([]);
});
