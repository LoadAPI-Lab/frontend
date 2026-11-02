import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig, mergeConfig } from 'vitest/config';

import viteConfig from './vite.config.ts';

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default mergeConfig(
    viteConfig,
    defineConfig({
        test: {
            coverage: {
                provider: 'v8',
                include: ['src/lib/**', 'src/api/live/**', 'src/api/fetcher.ts'],
                exclude: ['**/*.test.*', '**/*.stories.*'],
                thresholds: { lines: 70 },
            },
            projects: [
                {
                    extends: true,
                    test: {
                        name: 'unit',
                        environment: 'jsdom',
                        include: ['src/**/*.test.{ts,tsx}'],
                        setupFiles: ['./src/test/setup.ts'],
                    },
                },
                {
                    extends: true,
                    plugins: [storybookTest({ configDir: path.join(dirname, '.storybook') })],
                    test: {
                        name: 'storybook',
                        browser: {
                            enabled: true,
                            provider: playwright({}),
                            headless: true,
                            instances: [{ browser: 'chromium' }],
                        },
                    },
                },
            ],
        },
    }),
);
