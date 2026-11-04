import { fileURLToPath, URL } from 'node:url';

import babel from '@rolldown/plugin-babel';
import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Core runs on :3001 locally. In every environment the browser calls core's own paths (/v1/...)
// on its own origin; here the dev server forwards them, in production the reverse proxy does.
// No /api prefix on purpose: core scopes its auth cookies to /v1/auth and /v1/oauth, so the
// browser must see the same paths or it never sends the refresh and OAuth state cookies.
const apiTarget = process.env.API_PROXY_TARGET ?? 'http://localhost:3001';

export default defineConfig({
    plugins: [
        // must come before react(): generates the route tree and splits route code
        tanstackRouter({ target: 'react', autoCodeSplitting: true }),
        // React Compiler via Babel (plugin-react v6 has no Babel of its own)
        babel({ presets: [reactCompilerPreset()] }),
        react(),
        tailwindcss(),
    ],
    resolve: {
        alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    // Pre-bundle deps that are only discovered while tests or pages load. Without this, Vite
    // re-optimizes mid-run and reloads, which breaks the Storybook browser tests (and slows dev).
    // Add each new Base UI part here when a component starts using it.
    optimizeDeps: {
        include: [
            '@base-ui/react/field',
            '@base-ui/react/input',
            '@base-ui/react/menu',
            '@base-ui/react/number-field',
            '@base-ui/react/select',
            '@base-ui/react/tabs',
            '@base-ui/react/toast',
            '@base-ui/react/toggle',
            '@base-ui/react/toggle-group',
            '@base-ui/react/tooltip',
            'class-variance-authority',
            'clsx',
            'tailwind-merge',
            'lucide-react',
            'i18next',
            'react-i18next',
            'zod',
            '@tanstack/react-router',
            '@tanstack/react-query',
        ],
    },
    server: {
        port: 5173,
        strictPort: true,
        proxy: {
            '/v1': {
                target: apiTarget,
                changeOrigin: true,
            },
        },
    },
    preview: { port: 4173, strictPort: true },
});
