import { fileURLToPath, URL } from 'node:url';

import babel from '@rolldown/plugin-babel';
import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const apiTarget = process.env.API_PROXY_TARGET ?? 'http://localhost:3001';

export default defineConfig({
    plugins: [
        tanstackRouter({ target: 'react', autoCodeSplitting: true }),
        babel({ presets: [reactCompilerPreset()] }),
        react(),
        tailwindcss(),
    ],
    resolve: {
        alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
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
