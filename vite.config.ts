import { fileURLToPath, URL } from 'node:url';

import babel from '@rolldown/plugin-babel';
import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Core runs on :3001 locally. In every environment the browser calls /api on its own origin;
// here the dev server forwards it, in production the reverse proxy does.
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
    server: {
        port: 5173,
        strictPort: true,
        proxy: {
            '/api': {
                target: apiTarget,
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api/, ''),
            },
        },
    },
    preview: { port: 4173, strictPort: true },
});
