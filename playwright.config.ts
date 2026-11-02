import { defineConfig, devices } from '@playwright/test';

const port = 4173;

export default defineConfig({
    testDir: './e2e',
    fullyParallel: true,
    forbidOnly: Boolean(process.env.CI),
    retries: process.env.CI ? 2 : 0,
    reporter: process.env.CI ? [['html', { open: 'never' }], ['github']] : 'list',
    use: {
        baseURL: `http://localhost:${port}`,
        trace: 'on-first-retry',
        // desktop only: the app shows a notice below 1280px
        viewport: { width: 1440, height: 900 },
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
        },
    ],
    // mocked mode: MSW answers every API call, no backend needed
    webServer: {
        command: 'pnpm build:mock && pnpm preview',
        port,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
    },
});
