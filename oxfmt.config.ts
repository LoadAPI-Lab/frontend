import { defineConfig } from 'oxfmt';

export default defineConfig({
    arrowParens: 'always',
    bracketSameLine: false,
    bracketSpacing: true,
    ignore: [
        '**/node_modules/**',
        '**/.pnpm-store/**',

        '**/dist/**',
        '**/build/**',
        '**/.next/**',
        '**/out/**',
        '**/coverage/**',

        '**/.turbo/**',
        '**/.cache/**',

        '**/*.min.js',
        '**/*.bundle.js',

        '**/.env*',

        '**/pnpm-lock.yaml',
        '**/package-lock.json',
        '**/yarn.lock',

        '**/*.log',
        '**/.netlify/**',
        '**/.DS_Store',

        '**/.idea/**',
        '**/.vscode/**',

        'src/routeTree.gen.ts',
        'src/api/generated/**',
        'public/mockServiceWorker.js',
        'storybook-static/**',
        'playwright-report/**',
        'test-results/**',
    ],
    jsxSingleQuote: false,
    printWidth: 100,
    quoteProps: 'as-needed',
    semi: true,
    singleAttributePerLine: true,
    singleQuote: true,
    sortImports: true,
    sortPackageJson: true,
    sortTailwindcss: true,
    tabWidth: 4,
    trailingComma: 'all',
    useTabs: false,
});
