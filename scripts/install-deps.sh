#!/usr/bin/env sh
# One-time bootstrap: resolves the latest versions, writes pnpm-lock.yaml,
# installs the MSW worker and the Playwright browser. Commit the result.
# After this, everyone just runs `pnpm install`.
set -eu

pnpm add \
    react react-dom \
    @tanstack/react-router @tanstack/react-query \
    @base-ui/react \
    i18next react-i18next \
    zod react-hook-form @hookform/resolvers zustand \
    clsx tailwind-merge class-variance-authority lucide-react \
    @fontsource-variable/inter @fontsource-variable/jetbrains-mono

pnpm add -D \
    typescript @types/react @types/react-dom @types/node \
    vite @vitejs/plugin-react @rolldown/plugin-babel @babel/core @types/babel__core babel-plugin-react-compiler \
    tailwindcss @tailwindcss/vite \
    @tanstack/router-plugin @tanstack/router-cli \
    @tanstack/react-router-devtools @tanstack/react-query-devtools \
    vitest @vitest/coverage-v8 @vitest/browser-playwright jsdom \
    @testing-library/react @testing-library/user-event @testing-library/jest-dom \
    msw orval @faker-js/faker \
    @playwright/test @axe-core/playwright \
    storybook @storybook/react-vite @storybook/addon-docs @storybook/addon-a11y @storybook/addon-vitest \
    oxlint oxlint-tsgolint oxfmt \
    husky lint-staged @commitlint/cli @commitlint/config-conventional

pnpm exec msw init public --save
pnpm exec playwright install chromium
pnpm routes:generate

echo "Done. Now run: pnpm format && pnpm lint && pnpm typecheck && pnpm test"
