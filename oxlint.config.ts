import { defineConfig } from 'oxlint';

// Mirrors backend apps/core/oxlint.config.ts, plus React, a11y and import-boundary rules.
export default defineConfig({
    categories: {
        correctness: 'error',
        perf: 'warn',
        suspicious: 'warn',
    },

    env: { browser: true, builtin: true },

    ignorePatterns: [
        'node_modules',
        'dist',
        'storybook-static',
        'coverage',
        'playwright-report',
        'public/mockServiceWorker.js',
        'src/routeTree.gen.ts',
        'src/api/generated/**',
        '**/*.d.ts',
    ],

    options: { typeAware: true },

    // no react-perf: the React Compiler memoizes, and slot props (sidebar={<X />}) are our layout pattern
    plugins: ['typescript', 'unicorn', 'react', 'jsx-a11y', 'import', 'vitest'],

    rules: {
        'no-console': ['warn', { allow: ['warn', 'error'] }],
        'no-underscore-dangle': ['warn', { allow: ['__ENV__'] }],
        // side-effect imports we rely on: styles, i18n init, test matchers
        'import/no-unassigned-import': [
            'warn',
            { allow: ['**/*.css', '**/app/i18n', '@testing-library/jest-dom/vitest'] },
        ],
        'no-debugger': 'error',
        'no-shadow': 'error',
        'no-param-reassign': 'warn',
        'import/no-duplicates': 'error',
        eqeqeq: ['error', 'always'],
        curly: ['error', 'all'],
        'no-var': 'error',
        'prefer-const': 'error',
        'prefer-template': 'error',
        'object-shorthand': ['error', 'always'],

        'typescript/no-explicit-any': 'warn',
        'typescript/no-non-null-assertion': 'warn',
        'typescript/no-floating-promises': 'error',
        'typescript/await-thenable': 'error',
        'typescript/consistent-type-imports': [
            'error',
            { prefer: 'type-imports', fixStyle: 'separate-type-imports' },
        ],

        // automatic JSX runtime (React 17+): no `import React` needed
        'react/react-in-jsx-scope': 'off',
        'react/rules-of-hooks': 'error',
        'react/exhaustive-deps': 'warn',
        'react/jsx-key': 'error',
        'react/no-array-index-key': 'warn',
        'react/self-closing-comp': 'warn',
        'react/jsx-no-useless-fragment': 'warn',

        'jsx-a11y/alt-text': 'error',
        'jsx-a11y/anchor-is-valid': 'error',
        'jsx-a11y/click-events-have-key-events': 'error',
        'jsx-a11y/no-static-element-interactions': 'error',

        'import/no-cycle': 'error',
        'import/no-default-export': 'error',

        'unicorn/filename-case': ['error', { case: 'kebabCase', ignore: [String.raw`\.d\.ts$`] }],
        'unicorn/prefer-node-protocol': 'error',
        'unicorn/no-useless-undefined': 'error',
    },

    overrides: [
        {
            // TanStack Router file names (__root, _app, $param) and config files need default exports / special names
            files: ['src/routes/**'],
            rules: { 'unicorn/filename-case': 'off' },
        },
        {
            files: ['*.config.ts', '*.mjs', '.storybook/**', '**/*.stories.tsx'],
            rules: { 'import/no-default-export': 'off' },
        },
        {
            // tiers 1-2 never fetch data or reach into features
            files: ['src/components/**'],
            rules: {
                'no-restricted-imports': [
                    'error',
                    {
                        patterns: [
                            {
                                group: ['@/features/*', '@/features/**'],
                                message: 'components/* must not import features.',
                            },
                            {
                                group: ['@/api/*', '@/api/**', '@tanstack/react-query'],
                                message:
                                    'components/* do not fetch data; pass props from a feature.',
                            },
                        ],
                    },
                ],
            },
        },
        {
            // features talk to each other only through shared layers
            files: ['src/features/**'],
            rules: {
                'no-restricted-imports': [
                    'error',
                    {
                        patterns: [
                            {
                                group: ['@/routes/*', '@/routes/**'],
                                message: 'features must not import routes.',
                            },
                        ],
                    },
                ],
            },
        },
        {
            files: ['**/*.test.ts', '**/*.test.tsx', 'e2e/**'],
            rules: { 'no-magic-numbers': 'off' },
        },
    ],
});
